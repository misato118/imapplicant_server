import express from 'express';
import { getRequirementsResearch, addRequirements } from '../controllers/research_requirements.js';

import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getRequirementsResearch);
router.post('/', auth, addRequirements);
//router.patch('/', updateApplication);

export default router;