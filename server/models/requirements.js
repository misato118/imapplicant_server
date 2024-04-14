import mongoose from 'mongoose';

// Model for unique requirements in MongoDB
const requirementsSchema = mongoose.Schema({
    name: { type: String, unique: true },
    //app_arr: [String],
    //chi_square: Number, // -1: Influenced badly, 0: No association, 1: Influenced good
});

var Requirements = mongoose.model('Requirements', requirementsSchema);
export default Requirements;