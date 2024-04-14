import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

import User from '../models/user.js';

export const signin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (!existingUser) return res.status(404).json({ message: 'User doesn\'t exist' });

        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordCorrect) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ email: existingUser.email, id: existingUser._id }, process.env.JWT_SECRET, { expiresIn: '5h' });
        res.status(200).json({ result: existingUser, token });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
}

export const signup = async (req, res) => {
    const { email, password, confirmPassword, firstName, lastName } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        if (password !== confirmPassword) return res.status(400).json({ message: 'Password doesn\'t match' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await User.create({ email, password: hashedPassword, name: `${firstName} ${lastName}` });

        const token = jwt.sign({ email: result.email, id: result._id }, process.env.JWT_SECRET, { expiresIn: '5h' });

        res.status(200).json({ result, token });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
}

export const sendResetPasswordEmail = async (req, res) => {
    const { email } = req.body;
    try {
        console.log('email ' + email);
        const existingUser = await User.findOne({ email });
        if (!existingUser) return res.status(404).json({ message: 'No such user exists' });

        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        var transporter = nodemailer.createTransport({
            service: process.env.SERVICE,
            secure: true,
            auth: {
                user: process.env.HOST_EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        
        var mailOptions = {
            from: process.env.HOST_EMAIL,
            to: email,
            subject: 'imapplicant - Reset Password',
            //text: `Click the following link to reset your password: http://localhost:3000/reset_password/${token}`
            text: `Click the following link to reset your password: https://imapplicant-client.onrender.com/reset_password/${token}`
        };
          
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        await User.updateOne({ _id: existingUser._id }, { resetPassToken: token }, { new: true });

        res.status(200).json({});
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
}

export const resetPassword = async (req, res) => {
    try {
        console.log('resetPassword');
        const reqToken = req.body.token;
        const password = req.body.password;

        const existingUser = await User.findOne({ resetPassToken: reqToken.toString() });
        if (!existingUser) return res.status(400).json({ message: 'User cannot find' });

        const hashedPassword = await bcrypt.hash(password, 12);
        await User.updateOne({ _id: existingUser._id }, { resetPassToken: '', password: hashedPassword }, { new: true });

        res.status(200).json({ message: 'Password has been changed' });
    } catch (error) {
        console.log(error + ' ' + error.description);
        res.status(500).json({ message: 'Something went wrong' });
    }
}

