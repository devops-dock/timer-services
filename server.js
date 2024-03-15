const express = require('express');
const cors = require('cors');
const config = require('./config');
const mongoose = require('mongoose');
const TaskTracker = require('./timerModel'); 
const PORT = config.server.port;

const app = express();

// mongoose connect
const mongoUrl = config.database.mongoUrl;
const db = mongoose.connect(mongoUrl);

// cors middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000",
    methods: "GET,POST,PUT,DELETE",
}));

// middlewares
app.post('/user-tasks', async (req, res) => {
    const existinguser = await TaskTracker.findOne({'userData.email': req.body.userData.email})
    var payload = {
        userData: req.body.userData,
        userTasks: [{
            date: req.body.date,
            isFinished: req.body.isFinished,
            tasks: [...req.body.userTasks]
        }]
    }
    const filter = {'userData.email': {$in: [req.body.userData.email]}}
    const opts = {new: true, upsert: true}

    // new user
    if(!existinguser) {
        // const doc = await TaskTracker.findOneAndUpdate(filter, payload, opts) 
        const doc = await TaskTracker.create(payload)
        doc.save();
    }
    // old user
    else {
        // Is it new-date or old-date ?
        const oldT = existinguser.userTasks.findIndex(t => t.date === req.body.date)
        if(oldT === -1) { // new date
            console.log(oldT)
            const oldTask = existinguser.userTasks.map(t => t) // returns prev tasks
            const newTask = {
                date: req.body.date,
                isFinished: req.body.isFinished,
                tasks: req.body.userTasks
            }
            payload = {
                userTasks: [...oldTask, newTask]
            }
            console.log(payload)
            // retain old-date and add new-date task
            const doc = await TaskTracker.findOneAndUpdate(filter, payload, opts) 
            doc.save();
        } else { 
            console.log('same date updating')
            const targetDate = req.body.date.split(' ')[0]
            // old-date [ date exists already ? ] => just update the old-date tasks
            const doc = await TaskTracker.findOneAndUpdate(
                {'userTasks.date': targetDate}, 
                {$set: {'userTasks.$.tasks': req.body.userTasks}},
                {new: true}
            )
            doc.save();
        }
    }
    return res.send('submitted')
})

app.post('/tasks', async (req, res) => {
    const existinguser = await TaskTracker.findOne({'userData.email': req.body.email})
    if(existinguser) {
        // can refactor code
        const doc = existinguser
        return res.send(doc)
    }
})



if(db) {
    app.listen(PORT, (err, client) => {
        if(err) console.log(err.message)
        console.log('server connected at PORT: ', PORT)
        console.log('MongoDB database is connected.')
    });
}