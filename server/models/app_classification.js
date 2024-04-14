import mongoose from 'mongoose';

// Model for application classification (positive or negative result)
const appClassificationSchema = mongoose.Schema({
    appId: { type: mongoose.Types.ObjectId, ref: 'Application' },
    resumeId: { type: mongoose.Types.ObjectId, ref: 'Resume' },
    result: Number, // 1 for positive, 0 for negative
});

const AppClassification = mongoose.model('AppClassification', appClassificationSchema);
export default AppClassification;