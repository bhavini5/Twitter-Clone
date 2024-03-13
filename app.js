const mysql=require("mysql");
const express=require("express");
const session = require('express-session');
const app=express();
const path=require("path");
const methodOverride = require('method-override');
const{v4:uuidv4}=require('uuid');
const ejsMate=require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const { connect } = require("http2");
const sendVerifyEmail=require("./sendMail.js");
var multer=require("multer");


app.use(methodOverride('_method'));//method override in patch when form is edited
app.use(express.urlencoded({extended:true}));//parsing data
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"/views"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"public")));
app.use(methodOverride("_method"));
app.use('/uploads', express.static('uploads'));

app.use(session({
    secret: '', // Change this to your own secret key
    resave: false,
    saveUninitialized: false
}));


const connection=mysql.createConnection({
    host:'localhost',
    user: 'root',
    database :'twitter',
    password:'',
});
var storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"./uploads");
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+"-"+file.originalname); 
    }

})
app.get("/:usname/delete",(req,res)=>{
    let {usname}=req.params;
    let q=`select * from user where usname =?`;
    connection.query(q,[usname],(err,result)=>{
        if(err){
            console.log(err);
        }
    res.render("files/delete.ejs",{result:result,usname:usname ,msg:" "});
    })
})
app.delete("/:usname/delete",(req,res)=>{
    let {usname}=req.params;
    let {password,confirmPassword}=req.body;
    let q=`SELECT * FROM user WHERE usname = ?`;
    connection.query(q,[usname],(err,result)=>{
    let user=result[0];
    if (password !== confirmPassword) {
        req.session.errorMsg = "Passwords do not match";
        return res.render('files/delete.ejs', {result:result, msg: req.session.errorMsg });
    }
    if(user.password==password){
        let q1 = `update user set softdelete = 1  where usname=?`;
        connection.query(q1,[usname],(err,result1)=>{
            if(err){
                console.log(err);
            }
        res.redirect("/");

        })
    }
    else{
        req.session.errorMsg = "Wrong Password. Try Again!";
        return res.render('files/delete.ejs', { usname:usname,result: result, msg: req.session.errorMsg });
    }
    })
})
app.get("/",(req,res)=>{
    res.render("login.ejs",{msg:" "});
})
app.get("/logout", (req, res) => {
    res.render("login.ejs",{msg:" "});
    
});

app.get("/:usname/changePass",(req,res)=>{
    let {usname}=req.params;
    let q = `SELECT * FROM user WHERE usname = ?`;
    connection.query(q,[usname],(err,result)=>{
    res.render("files/changePAss.ejs",{result:result,usname:usname ,msg:" "})
    })
});

app.patch("/:usname/pass_submit", (req, res) => {
    let { usname } = req.params;
    let { password, Npassword } = req.body;

    let getUserQuery = `SELECT * FROM user WHERE usname = ? `;
    connection.query(getUserQuery, [usname], (err, result1) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error fetching user details");
        }

        if (result1.length === 0) {
            return res.status(404).send("User not found");
        }

        let user = result1[0];

        // Here you should compare the password securely, considering it's likely hashed.
        if (user.password === password) {
            let updatePasswordQuery = `UPDATE user SET password = ? WHERE usname = ?`;
            connection.query(updatePasswordQuery, [Npassword, usname], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error updating password");
                }
                console.log(result);
                res.redirect(`/${usname}/profile`);
            });
        } else {
            req.session.errorMsg = "Wrong Password. Try Again!";
            return res.render('files/changePAss.ejs', { usname:usname,result: result1, msg: req.session.errorMsg });
        }
    });
});

app.post("/login_submit",(req,res)=>{
   try{
    let {username,password}=req.body;
    // console.log(req.body);
    let q = `SELECT * FROM user WHERE usname = ? AND softdelete=0`;
    connection.query(q, [username], (err, result) => {
      if (err) {
        console.log(err);
        return res.send("Error fetching user details");
      }
  
      if (result.length > 0) {
        let user = result[0];
        console.log(user);
        console.log("User details:", user);
  
        if (user.password === password) {
          // Successful login
          res.redirect(`/${username}/home`);
        } else {
            req.session.errorMsg = "Wrong Password.Try Again!";
            return res.render('login.ejs', { msg: req.session.errorMsg });
        }
      } else {
        req.session.errorMsg = "Username not found";
        return res.render('login.ejs', { msg: req.session.errorMsg });

      }
    });
   }
   catch(err){
    next(err);
  }
})

app.get("/signup",(req,res)=>{
    
    res.render("signup.ejs",{msg:" "});
})

var profile_pic=multer({storage:storage});

app.post("/:usname/header/upload",profile_pic.single("header_img"),(req,res)=>{
    let {usname}=req.params;
    let filename, mimetype;
        if (req.file) {
            filename = req.file.filename;
            mimetype = req.file.mimetype;
        } else {
            console.log("No file uploaded");
        }
        let q = `UPDATE user SET headerpic = ? WHERE usname = ?`;

        connection.query(q, [filename, usname], (err, result) => {
            if (err) {
                console.log(err);
            }
            res.redirect(`/${usname}/profile`);
        });
        
})
var profile_pic=multer({storage:storage});

app.post("/:usname/profile/upload",profile_pic.single("profile_img"),(req,res)=>{
    let {usname}=req.params;
    let filename, mimetype;
        if (req.file) {
            filename = req.file.filename;
            mimetype = req.file.mimetype;
        } else {
            console.log("No file uploaded");
        }
        let q = `UPDATE user SET profilepic = ? WHERE usname = ?`;

        connection.query(q, [filename, usname], (err, result) => {
            if (err) {
                console.log(err);
            }
            res.redirect(`/${usname}/profile`);
        });
        
})

app.post("/next",(req,res)=>{
    try {
        let { fname, lname, usname, emailOrMobile, password, confirmPassword, dob, gender } = req.body;
        if (password !== confirmPassword) {
            req.session.errorMsg = "Passwords do not match";
            return res.render('signup.ejs', { msg: req.session.errorMsg });
        }
        let sql_check_username = "SELECT * FROM user WHERE usname = ?";
        connection.query(sql_check_username, [usname], (err, usernameResult) => {
            if (err) {
                console.error("Error checking username:", err);
                return res.status(500).send("Internal Server Error");
            }
            if (usernameResult.length > 0) {
                req.session.errorMsg = "Username already exists";
                return res.render('signup.ejs', { msg: req.session.errorMsg });
            }
            let sql_check_contact = "SELECT * FROM user WHERE contact = ?";
            connection.query(sql_check_contact, [emailOrMobile], (err, contactResult) => {
                if (err) {
                    throw err;
                }
                if (contactResult.length > 0) {
                    if (isNaN(emailOrMobile)){
                        req.session.errorMsg = "Phone Number already exists";
                        return res.render('signup.ejs', { msg: req.session.errorMsg });
                    }
                    req.session.errorMsg = "Email already exists";
                    return res.render('signup.ejs', { msg: req.session.errorMsg });
                    
                }
                let curdate = new Date();
                let month = curdate.getMonth() + 1;
                let dor = curdate.getFullYear() + "-" + month + "-" + curdate.getDate();
                let sql_insert_user = "INSERT INTO user (fname, lname, usname, contact, password, dob, dor, gender) VALUES (?, ?, ?, ?, ?, ?, ?,?)";
                connection.query(sql_insert_user, [fname, lname, usname, emailOrMobile, password, dob, dor, gender], (err, insertResult) => {
                    if (err) {
                        throw err;
                    }
                    
                        console.log(req.body);
                        res.redirect(`/${usname}/next`);
                });
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
})



app.get("/:usname/next", (req, res) => {
    let { usname } = req.params;
    let q = `SELECT * FROM user WHERE usname=?`;

    connection.query(q, [usname], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Internal Server Error");
        }

        if (results.length === 0) {
            return res.status(404).send("User not found");
        }

        // Check if the 'contact' property exists in the first result
        let emailOrMobile = results[0].contact;
        if (!isNaN(emailOrMobile)) {
            // If it's a number (phone number), render the page without sending an email
            return res.render("files/about.ejs", { usname });
        }
        
        // If it's an email address, send the verification email
        sendVerifyEmail(emailOrMobile)
            .then(() => {
                req.session.msg = "Account created, please check your email for verification";
                res.render("files/about.ejs", { usname });
            })
            .catch((error) => {
                console.error("Error sending verification email:", error);
                res.status(500).send("Error sending verification email");
            });
        
    });
});


app.post("/:usname/submit_signup",(req,res)=>{
    let {about}=req.body;
    let {usname}=req.params;
    let q=`select uid from user where usname = ?`;
    try {
        connection.query(q, [usname], (err, result) => {
            if (err) throw err;
            let user=result[0].uid;
            let q1=`insert into about (about,uid) VALUES (?,?)`;
            try {
                connection.query(q1, [about,user], (err, resp) => {
                    if (err) throw err;
                    res.redirect(`/${usname}/home`);
                });
            } catch (err) {
                console.log(err);
                res.send("Some error occurred in the database");
            }
        
                });
    } catch (err) {
        console.log(err);
        res.send("Some error occurred in the database");
    }

    
})
app.get("/:usname/home",(req,res)=>{
    let { usname } = req.params;
    let q = `SELECT user.*,tweet.* FROM user JOIN tweet ON user.uid = tweet.uid AND tweet.softdelete = 0 order by tweet.datetime desc`;
    connection.query(q, (err, results) => {
        if (err) {
            console.log(err);
            // Handle the error
            res.send("An error occurred.");
            return;
        }
        res.render("files/showallTweets.ejs", { results: results, usname:usname });
    });
    
})
app.get("/:usname/profile", (req, res) => {
    let { usname } = req.params;
    let q1 = `SELECT * FROM user INNER JOIN about ON user.uid = about.uid WHERE user.usname = ? `;

    connection.query(q1, [usname], (err, result1) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error occurred while fetching the profile");
        }

        let about = result1[0].about;

        let q = `SELECT * FROM user LEFT JOIN tweet ON user.uid = tweet.uid and tweet.softdelete=0 WHERE user.usname = ? order by tweet.datetime desc`;

        connection.query(q, [usname], (err, result2) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error occurred while fetching the profile");
            }

            // Render the template with the profile data
            res.render("files/profile.ejs", { result: result2,usname:usname,about:about });
        });
    });
});

app.get("/:usname/:tid/tweetdelete", (req, res) => {
    let { usname, tid } = req.params;
    let q = `UPDATE Tweet SET softdelete=1 WHERE tid=?`;
    connection.query(q, [tid], (err, result) => {
        if (err) {
            console.log("Error deleting tweet:", err);
            return res.status(500).send("Error deleting tweet.");
        }
        console.log("Tweet deleted successfully:", result);
        res.redirect(`/${usname}/profile`);
    });
});

app.get("/:usname/single_profile", (req, res) => {
    let { usname } = req.params;
    let q1 = `SELECT * FROM user INNER JOIN about ON user.uid = about.uid WHERE user.usname = ?`;

    connection.query(q1, [usname], (err, result1) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error occurred while fetching the profile");
        }

        let about = result1[0].about;

        let q = `SELECT * FROM user LEFT JOIN tweet ON user.uid = tweet.uid  WHERE user.usname = ? and user.softdelete=0 order by tweet.datetime desc`;

        connection.query(q, [usname], (err, result2) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error occurred while fetching the profile");
            }

            // Render the template with the profile data
            res.render("files/single_profile.ejs", { result: result2, usname: usname, about: about });
        });
    });
});




app.get("/:usname/edit",(req,res)=>{
    let{usname}=req.params;
    let q=`SELECT user.*, about.*  
    FROM user 
    INNER JOIN about ON user.uid = about.uid
    WHERE user.usname = ?`;
    try {
        connection.query(q, [usname], (err, result) => {
            if (err) throw err;
            res.render("update.ejs",{result});
        });
    } catch (err) {
        console.log(err);
        res.send("Some error occurred in the database");
    }
    
})
app.patch("/:usname/edit_submit", (req, res) => {
    let{usname}=req.params;
    const firstName = req.body.fname;
    const lastName = req.body.lname;
    const emailOrMobile = req.body.emailOrMobile;
    const summary = req.body.about;

    // Assuming you have established a MySQL connection named 'connection'
    const userQuery = "UPDATE user SET fname=?, lname=?,  contact=? WHERE usname=?";
    connection.query(userQuery, [firstName, lastName, emailOrMobile, usname], (err, userResult) => {
        if (err) {
            throw err;
        }

        const aboutQuery = "UPDATE about SET about=? WHERE uid=(SELECT uid FROM user WHERE usname=?)";
        connection.query(aboutQuery, [summary, usname], (err, aboutResult) => {
            if (err) {
                throw err;
            }
            res.redirect(`/${usname}/profile`);
            // res.render("files/profile",{result:aboutResult,usname:usname});
        });
    });
});

//incase have new username;

app.get("/:newUsname/profile", (req, res) => {
    let { newUsname } = req.params;
    let q = `SELECT user.*, about.*  FROM user INNER JOIN about ON user.uid = about.uid WHERE user.usname = ?`; // Add a WHERE clause to filter by usname

    try {
        connection.query(q, [newUsname], (err, result) => {
            if (err) throw err;
            res.render("files/profile.ejs", { result: result });
        });
    } catch (err) {
        console.log(err);
        res.send("Some error occurred in the database");
    }
});


//allprofiles
app.get("/:usname/profiles",(req,res)=>{
    let{usname}=req.params;
    let q=`SELECT * FROM user WHERE usname != ? and softdelete=0;    `;
    connection.query(q,[usname], (err, results) => {
        if (err) {
            throw err;
        }
    res.render("files/allProfiles.ejs",{results:results,usname:usname});

       
    });
})

app.get("/:usname/tweet",(req,res)=>{
    let{usname}=req.params;
    let q=`SELECT * FROM user WHERE usname = ?`;
    connection.query(q,[usname], (err, result) => {
        if (err) {
            throw err;
        }
        res.render("files/addTweet.ejs",{result ,usname});


       
    });
})
app.get("/:usname/showTweets", (req, res) => {
    let { usname } = req.params; // Use req.params to access route parameters
    let q = `SELECT user.*, tweet.*
    FROM Tweet
    JOIN user ON tweet.uid = user.uid
    WHERE user.usname = ? order by tweet.datetime desc`;
    
    // Assuming you have already defined the connection object
    connection.query(q, [usname], (err, results) => {
        if (err) {
            throw err;
        }
        // Check if results array is empty
        if (results.length === 0) {
            res.render("files/tweetError.ejs", { results ,usname:usname});
        } else {
            res.render("files/showTweets.ejs", { results,usname:usname });
        }
    });
});

//whenever a file is uploaded it is daved in the temp folder of the server and it is saved till the script is executing , so we gave to move that file to our folder 
//before it gets deleted 

var upload_detail=multer({storage:storage});

app.post("/:usname/tweet_submit", upload_detail.single("tweet_img"), (req, res) => {
    let { usname } = req.params;
    let { about } = req.body;

    try {
        let filename, mimetype;
        if (req.file) {
            filename = req.file.filename;
            mimetype = req.file.mimetype;
        } else {
            // Handle case where no file is uploaded, for example:
            filename = null;
            mimetype = null;
        }

        let q = `SELECT * FROM user WHERE usname=?`;
        connection.query(q, [usname], (err, result) => {
            if (err) {
                throw err;
            }
            let user = result[0].uid;
            let curdate = new Date();
            let month = curdate.getMonth() + 1;
            let datetime = curdate.getFullYear() + "-" + month + "-" + curdate.getDate() + " " + curdate.getHours() + ":" + curdate.getMinutes() + ":" + curdate.getSeconds();
            let q1 = `INSERT INTO Tweet (uid, content, datetime, image_video_name, type) VALUES (?, ?, ?, ?, ?)`;
            connection.query(q1, [user, about, datetime, filename, mimetype], (err, result) => {
                if (err) {
                    throw err;
                }
                res.redirect(`/${usname}/profile`);
            });
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
});

//follow
app.get("/:usname/:fusname/follow", (req, res) => {

    res.redirect(`/${usname}/profiles`);

})
app.post("/:usname/:fusname/follow", (req, res) => {
    const { usname, fusname } = req.params;

    // SQL query to fetch uid of the users based on their usernames
    let q = `SELECT uid FROM user WHERE usname IN (?, ?);`;

    connection.query(q, [usname, fusname], (err, results) => {
        if (err) {
            console.error("Error executing query", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        if (results.length !== 2) {
            return res.status(404).json({ error: "One or both users not found" });
        }

        const user1_uid = results[0].uid;
        const user2_uid = results[1].uid;

        // Insert into user_follows table
        let q1 = `INSERT INTO user_follows ( follower_uid,user_uid) VALUES (?, ?)`;

        connection.query(q1, [user1_uid, user2_uid], (err, result) => {
            if (err) {
                console.error("Error inserting into user_follows table", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            console.log("User follow successfully inserted:", result);
            res.redirect(`/${usname}/profiles`);
        });
    });
});



app.get("/verifyemail",(req,res)=>{
    let email=req.query['email'];
    let q=`update user set softdelete=1 where contact=?`;
    connection.query(q, [email],(err,result)=>{
        if(err){
            console.log(err);
        }
        if(result.affectedRows==1){
            req.session.msg-"email verified";
        }
        else{
            req.session.msg-"email verified";
        }
        res.redirect("/");
    }) 
})
app.use((err, req, res, next) => {
    let { statusCode =500,message ="something went wrong" } = err;
    res.status(statusCode).send(message);
}); 
app.all("*",(req,res)=>{
    res.render("files/error.ejs");
})

app.listen(8080, () => { console.log("server running at localhost port no 8080") });



// for login page
// app.get('/', function (req, res) {
//     var msg="";
//     if(req.session.msg!="")
//     var msg=req.session.msg;
//     res.render('login', { msg:msg});
// });

// app.post('/login_submit', function (req, res) {
//     const { email, pass } = req.body;
//     var sql = "";
//     if (isNaN(email))
//         sql = "select * from user where email='" + email + "' and password='" + pass + "' and status=1 and softdelete=0";

//     else
//         sql = "select * from user where mobile='" + email + "' and password='" + pass + "' and status=1 and softdelete=0";

//     db.query(sql, function (err, result, fields) {
//         if (err)
//             throw err;
//         if (result.length == 0)
//             res.render('login', { msg: "bad credentials" });
//         else {
//             req.session.userid = result[0].uid;
//             res.redirect('/home');
//         }

//     })

// })


// app.get("/signup", (req, res) => {
//     res.render("signup", { errmsg: "" });
// })
// app.post("/reg_submit", (req, res)=>{
//     const { fname, mname, lname, email, password, cpass, dob, gender } = req.body;
//     let sql_check = "";
//     if (isNaN(email))
//     sql_check="select email from user where email='"+email+"'";
//     else
//     sql_check = "select mobile from user where mobile="+ email;
// db.query(sql_check,function(err,result,fields){
//     if(err)
//     throw err;
// if(result.length==1){
//     let errmsg="";
//     if(isNaN(email))
//     errmsg="email already exists";
// else
// errmsg="mobile no already exists";
// res.render('signup',{errmsg:errmsg});
// }
// else{
//     let curdate= new Date();
//     let month=curdate.getMonth()+1;
//     let dor=curdate.getFullYear()+"-"+month+"-"+curdate.getDate();
//     let sql="";
//     if(isNaN(email))
//     sql="insert into user(fname,mname,lname,email,password,dob,dor,gender)values(?,?,?,?,?,?,?,?)";
// else
// sql="insert into user(fname,mname,lname,email,password,dob,dor,gender)values(?,?,?,?,?,?,?,?)"
// db.query(sql,[fname,mname,lname,email,password,dob,dor,gender],function(err,result,fields){
//     if(err)
//     throw err;
// if(result.insertId>0){
//     req.session.msg="account created check for verification code";
//     res.redirect('/')
// }
// })
    
// }
// })
// })

// app.get('/home',(req,res)=>{
//     if(req.session.userid!="")
//     {
//         res.render("home",{data:"user tweet will be displayed"})
//     }
//     else{
//         req.session.msg="first login to view the home page";
//         res.redirect('/');
//     }
// })
// app.get('/logout',function(req,res){
//     req.session.userid="";
//     res.redirect('/');
// })
// app.get("/followers",(req,res)=>{
//     let q="select * from user where uid in(select uid from user_follow where follow_id=?)";
//     db.query(q,[req.session.userid],function(err,result){
//         res.render("follow_view.ejs",{result:result});
//     })
// })

// let curdate=new Date();
// console.log("month:-"+curdate.getMonth()+curdate.getMonth()+cur)