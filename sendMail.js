// MAIL_HOST="smtp.gmail.com"
// MAIL_USER="learninggate288@gmail.com"
// MAIL_PASS="gfjediqehwoxjqob"
//SMTP server port number 25 pchlta h
//sendmail function to send mail



//configure mail and send it
//create a email transporter
//smpt (simple mail transfer protocol)
// 
const nodemailer = require('nodemailer');

async function sendVerifyEmail(to_email) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: "", //add email address
            pass: "", // add pass set by the app
        },
    });

    var info = await transporter.sendMail({
        to: to_email,
        from: "",
        subject: "please verify email",
        // text or html:""
        html: "<h1 style=\"color:red;background-color:yellow;\">click on link to login</h1><a href=\"http://localhost:8080/verifyemail?email=" + to_email + "\">click to verify</a>"
    });
}

module.exports = sendVerifyEmail;

// This won't work as intended because sendVerifyEmail is an asynchronous function
// You can't call it directly like this; you need to await it in an async function
// sendVerifyEmail('recipient@example.com');

