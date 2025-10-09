import type { Express } from "express";
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer, type Server } from "http";
// Use global fetch in Node 18+, fallback to node-fetch if unavailable
let _fetch: typeof fetch;
try { _fetch = (global as any).fetch || (require('node-fetch') as any); } catch { _fetch = (global as any).fetch; }
import { storage } from "./storage";
import { setRestaurantOwnerBackend, verifyIdToken, businessEmailExists } from './firebaseAdmin';

interface AssignReq {
  restaurantId: string;
  email: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve locally downloaded images in /images at project root
  const localImagesDir = path.resolve(process.cwd(), 'images');
  try { fs.mkdirSync(localImagesDir, { recursive: true }); } catch {}
  app.use('/images', express.static(localImagesDir));
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  // API endpoint to assign restaurant owner; server-side only
  app.post('/api/assign-owner', async (req, res) => {
    const body = req.body as AssignReq;
    if (!body || !body.restaurantId || !body.email) {
      return res.status(400).json({ message: 'restaurantId and email required' });
    }
    // Authorization: require a Bearer token in Authorization header
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ message: 'Authorization header required (Bearer token)' });
    const idToken = m[1];
    try {
      const decoded = await verifyIdToken(idToken);
      // allow if token has admin claim
      const isAdmin = !!(decoded && (decoded as any).admin === true);
      const callerEmail = (decoded && (decoded as any).email) ? (decoded as any).email.toLowerCase() : '';

      // business email being assigned must exist in DB
      const businessExists = await businessEmailExists(body.email);
      if (!businessExists) return res.status(400).json({ message: 'Business user does not exist.' });

      // authorize: caller is admin OR caller email matches assigned email
      if (!isAdmin && callerEmail !== (body.email || '').toLowerCase()) {
        return res.status(403).json({ message: 'Forbidden: caller not authorized to assign this owner' });
      }

      await setRestaurantOwnerBackend(body.restaurantId, body.email);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error('assign-owner failed', err);
      if (err && err.code === 'BUSINESS_USER_MISSING') return res.status(400).json({ message: err.message });
      return res.status(401).json({ message: err?.message || 'invalid token or unauthorized' });
    }
  });

  // Google Place Photo proxy: GET /api/place-photo?q=QUERY&lat=..&lng=..
  app.get('/api/place-photo', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const lat = req.query.lat ? Number(req.query.lat) : undefined;
      const lng = req.query.lng ? Number(req.query.lng) : undefined;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
      if (!q) return res.status(400).json({ message: 'Missing query q' });
      if (!apiKey) return res.status(400).json({ message: 'Server missing GOOGLE_PLACES_API_KEY' });

      // Prefer Find Place with location bias if coords provided for exact match
      let placeId: string | undefined;
      if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        const fpUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=place_id,photos&locationbias=point:${lat},${lng}&key=${apiKey}`;
        const fpResp = await _fetch(fpUrl);
        const fpJson: any = await fpResp.json();
        placeId = fpJson?.candidates?.[0]?.place_id;
      }
      if (!placeId) {
        const tsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${apiKey}`;
        const tsResp = await _fetch(tsUrl);
        const tsJson: any = await tsResp.json();
        placeId = tsJson?.results?.[0]?.place_id;
      }
      if (!placeId) return res.status(404).json({ message: 'Place not found' });

      const pdUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos,name&key=${apiKey}`;
      const pdResp = await _fetch(pdUrl);
      const pdJson: any = await pdResp.json();
      const photoRef = pdJson?.result?.photos?.[0]?.photo_reference;
      if (!photoRef) return res.status(404).json({ message: 'No photos found' });

      const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(photoRef)}&key=${apiKey}`;
      res.json({ imageUrl });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Failed to fetch photo' });
    }
  });

  // Download and persist Google Place photo locally; returns a served relative path
  app.get('/api/place-photo/download', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const lat = req.query.lat ? Number(req.query.lat) : undefined;
      const lng = req.query.lng ? Number(req.query.lng) : undefined;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
      if (!q) return res.status(400).json({ message: 'Missing query q' });
      if (!apiKey) return res.status(400).json({ message: 'Server missing GOOGLE_PLACES_API_KEY' });

      let placeId: string | undefined;
      if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        const fpUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=place_id,photos&locationbias=point:${lat},${lng}&key=${apiKey}`;
        const fpResp = await _fetch(fpUrl);
        const fpJson: any = await fpResp.json();
        placeId = fpJson?.candidates?.[0]?.place_id;
      }
      if (!placeId) {
        const tsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${apiKey}`;
        const tsResp = await _fetch(tsUrl);
        const tsJson: any = await tsResp.json();
        placeId = tsJson?.results?.[0]?.place_id;
      }
      if (!placeId) return res.status(404).json({ message: 'Place not found' });

      const pdUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos,name&key=${apiKey}`;
      const pdResp = await _fetch(pdUrl);
      const pdJson: any = await pdResp.json();
      const photoRef = pdJson?.result?.photos?.[0]?.photo_reference;
      const placeName = pdJson?.result?.name || q;
      if (!photoRef) return res.status(404).json({ message: 'No photos found' });

      const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(photoRef)}&key=${apiKey}`;
      const imgResp = await _fetch(imageUrl);
      const arrayBuffer = await imgResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = placeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const fileName = `${safeName || 'place'}-${photoRef.slice(0,8)}.jpg`;
      const filePath = path.join(localImagesDir, fileName);
      await fs.promises.writeFile(filePath, buffer);
      const servedPath = `/images/${fileName}`;
      res.json({ imagePath: servedPath });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Failed to download photo' });
    }
  });

  // Generic URL downloader -> saves into /images and returns served path
  app.post('/api/download-url', async (req, res) => {
    try {
      const url = String((req.body && req.body.url) || '').trim();
      let name = String((req.body && req.body.name) || '').trim();
      if (!url) return res.status(400).json({ message: 'Missing url' });
      if (!name) {
        const u = new URL(url);
        name = path.basename(u.pathname) || 'file';
      }
      const resp = await _fetch(url);
      if (!resp.ok) return res.status(400).json({ message: `Failed to fetch: ${resp.status}` });
      const ab = await resp.arrayBuffer();
      const buf = Buffer.from(ab);
      const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const fileName = base || `file-${Date.now()}`;
      const extGuess = (url.match(/\.(jpg|jpeg|png|webp|gif)(?:$|[?#])/i) || [])[1] || 'jpg';
      const finalName = fileName.endsWith(extGuess) ? fileName : `${fileName}.${extGuess}`;
      const filePath = path.join(localImagesDir, finalName);
      await fs.promises.writeFile(filePath, buf);
      return res.json({ imagePath: `/images/${finalName}` });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || 'Download failed' });
    }
  });

  return httpServer;
}
