import mongoose from 'mongoose';

const userSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    tokens: [
        {
            token: {
                type: String,
                required: true,
            },
        },
    ],
    appId: [{ type: mongoose.Types.ObjectId, ref: 'Applications' }], // arr of application ids (from MongoDB)
    reqId: [{
        refId: {
            type: mongoose.Types.ObjectId,
            ref: 'Requirements',
        },
        name: String,
        app_arr: [Number],
        chi_square: {
            isAssociated: Boolean,
            table: [[Number]]
        },
    }],
    researchReqId: [{
        kValue: Number,
        refId: { type: mongoose.Types.ObjectId, ref: 'ResearchRequirements' },  
    }], // arr of researchReq ids (from MongoDB)
    resetPassToken: String,
});

export default mongoose.model('User', userSchema);