import Application from '../models/application.js';
import User from '../models/user.js';
import ResearchRequirements from '../models/research_requirement.js';
import express from 'express';
import { spawn } from 'child_process';

const router = express.Router();

// Get table and return its data
export const getApplications = async (req, res) => {
    try {
        const id = req.userId ? req.userId : undefined;

        const user = await User.findOne({ _id: id });
        if (!user) return res.status(404).send('No user found');

        const allAppIds = user.appId // array of app reference ids
        const applications = await Application.find().where('_id').in(allAppIds).exec();

        res.status(200).json(applications);
    } catch (error) {
        res.status(404).json({ message: error.description });
    }
}

export const createApplication = async (req, res) => {
    const id = req.userId; // user ID on MongoDB
    const application = req.body.app;
    const localId = req.body.id;

    const newApplication = new Application({
        local_id: localId,
        title: application.title,
        status: application.status,
        company: application.company,
        post_url: application.post_url,
        location: application.location,
        income: application.income,
        benefits: application.benefits,
        requirements: application.requirements,
        date: application.date,
        status_history: [application.status],
    });

    try {
        const user = await User.find({ _id: id });
        if (!user) return res.status(404).send('No user found');

        await newApplication.save(); // Add an application
        await User.updateOne({ _id: id }, { $push: { appId: newApplication._id } }, { new: true });

        // Was supposed to conduct chi-square test here
        /*
        if (application.status == 'accepted' || application.status == 'interview' || application.status == 'rejected') {
            statusResearch(id, res);
        }
        */
        
        res.status(200).json(newApplication);
    } catch (error) {
        res.status(409).json({ message: error.description });
    }
}

export const updateApplication = async (req, res) => {
    const updatedApplication = req.body.updatedApp;

    try {
        await Application.updateOne({ _id: req.body.refId }, {
            title: updatedApplication.title,
            status: updatedApplication.status,
            company: updatedApplication.company,
            post_url: updatedApplication.post_url,
            location: updatedApplication.location,
            income: updatedApplication.income,
            benefits: updatedApplication.benefits,
            requirements: updatedApplication.requirements,
            date: updatedApplication.date,
        }, { new: true });
        
        res.status(200).json({ message: 'Application Updated' });
    } catch (error) {
        res.status(409).json({ message: error.description });
    }
}

// Delete multiple applications
export const deleteApplications = async(req, res) => {
    const id = req.userId; // user ID on MongoDB
    const appIdArr = req.body; // _id in applications table

    try {
        const user = await User.findOne({ _id: id });
        if (!user) return res.status(404).send('No user found');

        var nameIdObjArr = []; // { name: 'req1', id: 1 } where id is local_id
        const appArr = await Application.find().where('_id').in(appIdArr).exec();
        appArr.map((app) => {
            nameIdObjArr.push({ name: app.requirements, id: app.local_id });
        });

        // Delete local app id from app_arr in reqId || Remove the whole obj from reqId array
        nameIdObjArr.map((nameIdObj) => { // Go through each app
            nameIdObj.name.map((reqName) => { // Go through each reqName in an app
                const index = user.reqId.findIndex((obj) => obj.name === reqName); // index for reqId

                if (index > -1) {
                    var foundAppArr = user.reqId[index].app_arr;
                    const appArrIndex = foundAppArr.indexOf(nameIdObj.id);
                    if (appArrIndex > -1) {
                        foundAppArr.splice(appArrIndex, 1); // Remove local_id from app_arr
                    }
                    
                    if (foundAppArr.length < 1) {
                        user.reqId.splice(index, 1);
                    }
                }
            });
        });

        // Delete reference ids from appId in users table
        appIdArr.map((appId) => {
            const index = user.appId.findIndex((obj) => obj.equals(appId));
            if (index > -1) {
                user.appId.splice(index, 1);
            }
        }); 

        await user.save();

        // Delete apps from applications table
        const idArr = appArr.map((app) => app._id);
        await Application.deleteMany({ _id: idArr });

        // Re-calculate researchReqId
        await deleteReqFromResReq(id, res);

        res.status(200).json(idArr);
    } catch (error) {
        console.log('deleteApplications error ' + error);
        res.status(409).json({ message: error.description });
    }
}

export const getFieldValues = async(req, res) => {
    const url = req.body.url;

    // Fetch result from python
    const data = {
        url: url,
    }

    var resultArr;

    try {
        let stringifiedData = JSON.stringify(data); // all unique requirements
        const py = spawn('python', ['./data_analysis/scrape_app.py', stringifiedData]);
        var resultString = '';
    
        // Get data from python
        py.stdout.on('data', function (stdData) {
            resultString += stdData.toString();
        });
    
        // Error handling
        py.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
    
        // When all the data from python have been sent
        py.stdout.on('end', function () {
            resultArr = resultString.length > 0 ? resultString.split(): undefined;
            res.status(200).json({ values: resultArr });
        });

    } catch (error) {
        res.status(409).json({ message: error.description });
    }
}

export const updateStatus = async(req, res) => {
    const id = req.userId; // user ID on MongoDB
    const appId = req.body.appId; // _id in applications table
    const newStatus = req.body.newStatus; // new status to update

    try {

        if (!id) {
            return;
        }
        
        // Push a new status to status_history in applications table
        await Application.updateOne({ _id: appId }, { $push: { status_history: newStatus }, $set: { status: newStatus } }, { new: true });

        // Send data to Python
        statusResearch(id, res); // userId and data
        //res.status(200).json({});
    } catch (error) {
        res.status(409).json({ message: error.description });
    }
}

async function deleteReqFromResReq(userId, res) {
    try {
        // Get researchReqId refId where kValue == 1 in users table
        const user = await User.findOne({ _id: userId });

        const refId = user.researchReqId[0].refId;
        const reqIdObjArr = user.reqId;
        var pyArr = []; // [['req1'], ['req2'], ...]
        var reqInfo = []; // [{name:'req1', app_arr:[...]}, {...}, ...]
        var insertData = []; // == frequency in researchrequirements table

        reqIdObjArr.map((reqIdObj) => {
            const name = reqIdObj.name;
            const app_arr = reqIdObj.app_arr;

            pyArr.push([name]);
            reqInfo.push({ name: name, app_arr: app_arr });
            insertData.push({ combination: [name], count: app_arr.length });
        });

        // Change frequency of the refId in researchrequirements table where kValue == 1
        await ResearchRequirements.updateOne({ _id: refId, kValue: 1 }, { frequency: insertData }, { new: true });

        // Run the same codes after assigning the data part from research_requirements.js
        const data = {
            array: pyArr,
            object: reqInfo,
        }

        let stringifiedData = JSON.stringify(data); // all unique requirements
    
        const py_combination = spawn('python', ['./data_analysis/req_patterns_calc.py', stringifiedData]);
        var resultString = '';
    
        // Get data from python
        py_combination.stdout.on('data', function (stdData) {
            resultString += stdData.toString();
        });
    
        // Error handling
        py_combination.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
    
        // When all the data from python have been sent
        py_combination.stdout.on('end', function () {
            var objStr = '';
            let index = resultString.indexOf('{');
            if (index > -1) {
                objStr = resultString.slice(index);
            }
    
            let resultData = JSON.parse(objStr);
    
            let combined = resultData['combined'];
    
            const freqLength = Object.keys(combined).length;
            var frequency = [];
                
            for (var i = 1; i < freqLength + 1; i++) {
                var subFrequency = [];
                Array.from(combined[i]).map((combination) => {
                    if (combination.length > 0) {
                        const count = combination[0];
                        combination.shift();
                        const item = { combination: combination, count: count };
                        subFrequency.push(item);
                    }
                });
                    
                frequency.push({ kValue: i, frequency: subFrequency });
                    
                 // data where k == 1 has been already inserted previously, so inserting is only from k == 2
                if (i != 1) {
                    addFreqData(user, i, subFrequency); // Add data to researchrequirements in mongodb
                }
            }
    
            const research_requirement = frequency;
            //console.log('when sending res back ' + JSON.stringify(frequency));
            return research_requirement;
        });
        
    } catch (error) {
        console.log(error);
    }
}

async function updateUserProp(id, prop, newData, k) {
    await User.updateOne({ _id: id }, { $push: { [prop]: { kValue: k, refId: newData._id } } }, { new: true });
}

async function addFreqData(user, k, freq) {
    const userResReqObj = await user.researchReqId.find((item) => item.kValue == k);
    
    if (userResReqObj) { // If data with k already exists, then overwrite
        const resReqObj = await findResReqData(userResReqObj);
        await ResearchRequirements.updateOne({ _id: resReqObj._id, kValue: k }, { frequency: freq }, { new: true });
    } else { // If not, add a new data
        if (freq.length < 1) {
            return;
        }
        const newData = await new ResearchRequirements({ kValue: k, frequency: freq });
        await newData.save();
        // Add to user too
        updateUserProp(user._id, 'researchReqId', newData, k);
    }
}

async function findResReqData(userResReqObj) {
    try {
        const resReqObj = await ResearchRequirements.find({ _id: userResReqObj.refId });
        return resReqObj;
    } catch (error) {
        console.log(error);
    }
}

// Send data to Python to calculate associations between status and each requirement
async function statusResearch(userId, res) {
    try {
        // Prep data for chi square calc
        const user = await User.findOne({ _id: userId });
        if (!user) return res.status(404).send('No user found');

        var pyArr = [];
        user.reqId.map((reqObj) => {
            pyArr.push(reqObj.name);
        });

        var reqInfo = [];
        const appRefIdArr = user.appId;
        const applications = await Application.find().where('_id').in(appRefIdArr).exec(); // Get all apps for the user
        applications.map((application) => {
            const status = application.status;
            const requirements = application.requirements;
            if (status == 'interview' || status == 'accepted' || status == 'rejected') {
                reqInfo.push({ status: status, requirements: requirements });
            }
        });

        const data = {
            array: pyArr, // [['req1'], ['req2'], ...]
            object: reqInfo, // [{status: ..., requirements:[...]}, {...}, ...]
        }

        if (reqInfo.length < 1) {
            // Do nothing
            res.status(200).json({});
        }

        let stringifiedData = JSON.stringify(data);
    
        const py_combination = spawn('python', ['./data_analysis/chi_square_indep.py', stringifiedData]);
        var resultString = '';
    
        // Get data from python
        py_combination.stdout.on('data', function (stdData) {
            resultString += stdData.toString();
        });
    
        // Error handling
        py_combination.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            return {};
        });
    
        // When all the data from python have been sent
        py_combination.stdout.on('end', function () {
            var objStr = '';
            let index = resultString.indexOf('\n');
            if (index > -1) {
                objStr = resultString.slice(index);
            }

            let resultData = JSON.parse(objStr);

            let combined = resultData['combined'];
            
            addChiToUser(userId, combined, res);
        });
    } catch (error) {
        console.log(error);
    }
}

// Loop through chi_square_indep's result data  for adding to user's reqId
async function addChiToUser(userId, combined, res) {
    try {
        const user = await User.findOne({ _id: userId });
        if (!user) return res.status(404).send('No user found');

        for (const [key, value] of Object.entries(combined)) {
            addChiSquareData(userId, key, value.is_associated, value.table);
        }

        res.status(200).json({combined});
    } catch (error) {
        console.log(error);
    }
}

// Add each data to user's reqId's chi_square
async function addChiSquareData(userId, key, isAssociated, table) {
    try {
        const user = await User.findOne({ _id: userId });
        if (!user) return res.status(404).send('No user found');

        await User.updateOne({ _id: userId, 'reqId.name': key }, { $set: { 'reqId.$.chi_square': { isAssociated: isAssociated, table: table }} }, { new: true });
    } catch (error) {
        console.log(error);
    }
}

export default router;