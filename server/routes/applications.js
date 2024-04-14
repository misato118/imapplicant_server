import express from 'express';
import { getApplications, createApplication, updateApplication, deleteApplications,
    getFieldValues, updateStatus } from '../controllers/applications.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getApplications);
router.post('/', auth, createApplication);
router.put('/', auth, updateApplication);
router.delete('/', auth, deleteApplications);

router.post('/autoComplete', auth, getFieldValues);
router.post('/association', auth, updateStatus);

export default router;