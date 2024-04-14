import mongoose from 'mongoose';

// Model for research requirements in MongoDB
const researchReqSchema = mongoose.Schema({
    kValue: { type: Number, required: true },
    frequency: [{
        combination: {
            type: [String],
            default: [],
        },
        count: Number,
    }],
});

var ResearchRequirements = mongoose.model('ResearchRequirements', researchReqSchema);
export default ResearchRequirements;