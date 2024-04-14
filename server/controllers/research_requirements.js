import ResearchRequirements from '../models/research_requirement.js';
import Requirements from '../models/requirements.js';
import Application from '../models/application.js';
import User from '../models/user.js';
import express from 'express';
import { spawn } from 'child_process';

const router = express.Router();

// Get requirements frequency pattern calc data
export const getRequirementsResearch = async (req, res) => {
    try {
        const id = req.userId;

        const user = await User.find({ _id: id });
        if (!user) return res.status(404).send('No user found');

        const allReqIds = user.researchReqId;
        const research_requirement = await ResearchRequirements.find().where('_id').in(allReqIds).exec();

        res.status(200).json(research_requirement);
    } catch (error) {
        res.status(500).json({ message: error.description });
    }
}

// This occurs when a new unique requirement has been added to requirements table in appDB
export const addRequirements = async (req, res) => {
    try {
        const id = req.userId;
        const requirements = req.body.requirements; // Get all requirements
        const appId = req.body.id;

        if (!requirements) {
            res.status(200).json({});
            return;
        }

        const user = await User.findOne({ _id: id });
        if (!user) return res.status(404).send('No user found');

        await addUniqueReq(user._id, requirements, appId); // Deal with reqs in user table
        var initialArr = [];
        var firstAdd = false; // true = user's first time adding an app, false = not first time

        // if user's researchReqId has items in arr in mongodb
        if (user.researchReqId.length > 0) {
            const existingResReqIds = await user.researchReqId.find((item) => item.kValue == 1);

            const arrK1Obj = await ResearchRequirements.findOne({ _id: existingResReqIds.refId, kValue: 1 });
            var newFreq = [];

            // Update existing researchRequirements table where k == 1
            arrK1Obj.frequency.map((obj) => { // Loop through each combination & count object in mongodb
                if (requirements.includes(obj.combination[0])) { // if data from client includes the requirement
                    newFreq.push({ combination: obj.combination, count: obj.count + 1 });
                    const index = requirements.indexOf(obj.combination[0]);
                    if (index > -1) {
                        requirements.splice(index, 1); // Remove the requirement from arr
                    }
                } else { // if requirement is new
                    newFreq.push(obj);
                }
                initialArr.push(obj.combination[0]);
            });

            requirements.map((requirement) => { // Loop through the leftover of arr
                newFreq.push({ combination: [requirement], count: 1 });
                initialArr.push(requirement);
            });

            newFreq.sort(compare);

            arrK1Obj.frequency = newFreq;
            await arrK1Obj.save();
        } else { // if no calculation hasn't been done yet
            console.log('3. no arrK1Obj');
            firstAdd = true;
            const newFreq = [];
            requirements.map((requirement) => {
                newFreq.push({ combination: [requirement], count: 1 });
                initialArr.push(requirement);
            });

            newFreq.sort(compare);

            const newData = new ResearchRequirements({ kValue: 1, frequency: newFreq });
            await newData.save();

            updateUserProp(id, 'researchReqId', newData, 1);
        }

        initialArr.sort();
        var pyArr = initialArr.map((item) => {
            return [item];
        });

        const updatedUser = await User.findOne({ _id: id });
        if (!updatedUser) return res.status(404).send('No user found');

        const reqInfo = firstAdd == false ? await getReqAndArr(updatedUser, requirements, appId) // updatedUser -> user?
            : requirements.map((req) => {
                return { name: req, app_arr: [appId] };
            });

        // Fetch calculated result from python
        const data = {
            array: pyArr,
            object: reqInfo,
        }

        //findAssociation(user, pyArr); // This runs when status changed

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
            console.log('when sending res back ' + JSON.stringify(frequency));
            res.status(200).json(research_requirement);
        });
 
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.description });
    }
}

// Sort frequency arr by combination name
function compare(a, b) {
    if ( a.combination[0] < b.combination[0] ){
        return -1;
      }
      if ( a.combination[0] > b.combination[0] ){
        return 1;
      }
      return 0;
}


// Add unique requirement to Requirement in Mongodb or add id to app_arr
async function addUniqueReq(id, requirements, appId) {
    try {
        // reqId: [{ id: ..., app_arr: [...], chi_square: Number }, {}, ...]
        requirements.map((requirement) => {
            Requirements.findOne({ name: requirement }).then((foundOne) => {
                updateArr(id, foundOne, requirement, appId);
            });
        });
        return;        
    } catch (error) {
        console.log(error.name);
    }
}


// Update app_arr within user's reqId array
async function updateArr(id, foundOne, requirement, newId) {
    try {
        const req = foundOne == null ? await addOneReq(requirement) : foundOne; // Requirement
        
        const existingItem = await User.find({ _id: id }).where('reqId.refId').equals(req._id).exec();
        var reqExists = false;

        if (existingItem.length > 0) { // user has added this req before
            reqExists = true;
        } else {
            reqExists = false;
        }

        saveData(id, reqExists, req, newId);

    } catch (error) {
        console.log(error.name);
    }
}

async function saveData(userId, reqExists, req, appId) {
    try {
        // add new id to existing obj's app_arr
        if (reqExists) {
            await User.updateOne({ '_id': userId, 'reqId.refId': req._id }, { $push: { 'reqId.$.app_arr': appId } }, { new: true });
        } else {
            await User.updateOne({ '_id': userId }, { $push:  { reqId: { refId: req._id, name: req.name, app_arr: [appId] } } }, { new: true });
        }

    } catch (error) {
        console.log(error.description);
    }
}

async function addOneReq(requirement) {
    const newData = await new Requirements({ name: requirement });
    newData.save();

    return newData;
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

// Get { name: 'reqname', app_arr: [...] }
async function getReqAndArr(user, requirements, appId) {
    try {
        var result = [];
        var updatedReqs = requirements;

        const allReqIds = user.reqId; // reqId arr in user table
        await allReqIds.map((obj) => {
            const object = { name: obj.name, app_arr: obj.app_arr };
            result.push(object);
            if (requirements.includes(obj.name)) {
                const index = updatedReqs.indexOf(obj.name);
                updatedReqs.splice(index, 1);
            }
        });

        // This is necessary as user table might not have been updated for reqId
        await updatedReqs.map((req) => {
            result.push({ name: req, app_arr: [appId] });
        });

        return result;
    } catch (error) {
        console.log(error);
    }
}

async function findAssociation(user, arr) {
    // Fetch calculated result from python

    const allAppIds = user.appId;

    const data = {
        array: arr,
        object: {},
    }    

    try {
        const appData = await Application.find({ _id : { $in: allAppIds } }, '_id status requirements').exec();
        data.object = appData;
        console.log('findAssociation2 ' + JSON.stringify(appData));

        let stringifiedData = JSON.stringify(data); // all unique requirements

        const py_process = spawn('python', ['./data_analysis/chi_square_indep.py', stringifiedData]);
        var resultString = '';

        // Get data from python
        py_process.stdout.on('data', function (stdData) {
            resultString += stdData.toString();
        });

        // Error handling
        py_process.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        // When all the data from python have been sent
        py_process.stdout.on('end', function () {
            console.log(JSON.stringify(resultString));
            console.log(resultString);
        });
    } catch (error) {
        console.log(error);
    }
}

async function getDataForUser(allResReqIds) {
    try {
        const research_requirement = await ResearchRequirements.find({ _id : { $in: allResReqIds } });
        return research_requirement;
    } catch (error) {
        console.log(error);
    }
}

export default router;