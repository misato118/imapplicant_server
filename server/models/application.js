import mongoose from 'mongoose';

// Model for applications in MongoDB
const applicationSchema = mongoose.Schema({
    local_id: { type: Number, required: true }, // id in indexedDB
    title: { type: String, required: true },
    status: String,
    company: { type: String, required: true },
    post_url: String,
    location: String,
    income: Number,
    benefits: [String],
    requirements: [String],
    date: String,
    status_history: [String],
});

const Application = mongoose.model('Applications', applicationSchema);
export default Application;