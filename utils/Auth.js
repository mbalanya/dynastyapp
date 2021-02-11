const db = require("../db");
const bcrypt = require('bcryptjs');
const { use } = require("../routes/users");
const jwt = require("jsonwebtoken");
const SECRET = process.env.TOKEN_SECRET;
const passport = require('passport');

/** 
 * @DESC To register the user (ADMIN, SUPER_ADMIN, USER)
*/
const userRegister = async (userRef, userDetails, role, res) => {
    try{
        // Validate the username
        let usernameNotTaken = await validateUsername(userDetails.username);
        if (!usernameNotTaken) {
            return res.status(400).json({
                message: `Username is already taken.`,
                success: false
            });
        };
        // Validate the phone number
        let phoneNumberNotRegistered = await validatePhoneNumber(userDetails.phone_number);
        if (!phoneNumberNotRegistered) {
            return res.status(400).json({
                message: `Phone Number is already registered.`,
                success: false
            });
        };

        // Get the hashed password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(userDetails.password, salt);
        // const hashedPassword = await bcrypt.hash(userDetails.password, salt);

        // create a new user
        try{
            const results = await db.query("INSERT INTO members (username, phone_number, role, image_url, password) VALUES ($1, $2, $3, $4, $5) returning *", [userDetails.username, userDetails.phone_number, role, userDetails.image_url, hashedPassword])
            const logging = await db.query("INSERT INTO logs (phone_number, username, action) VALUES ($1, (SELECT username FROM members WHERE member_id=$2), $3)", [userDetails.phone_number, serializeUser(userRef.rows[0]).member_id, `registered this user with the role of ${role}`])

            res.status(201).json({
                status: "success",
                results: results.rows.length,
                data: {
                    members: results.rows[0],
                }
            })
        } catch (err) {
            console.log(err)
            return res.status(400).json({error: err.detail});
        };
    } catch (err) {
        console.log(err);
        // Implement logger function (eg winston)
        return res.status(500).json({
            message: "Error while registering Member",
            success: false
        });
    };
};

/** 
 * @DESC To login the user (ADMIN, SUPER_ADMIN, USER)
*/

const userLogin = async (userCredentials, role, res) => {
    let { username, password, phone_number } = userCredentials;

    // Check if username or phone number is in the database 
    try{
        const usernameResult = await db.query("SELECT * FROM members WHERE username = $1", [username])
        const user = usernameResult.rows[0];

        if (user == undefined || !user) {
            const phoneNumberResult = await db.query("SELECT * FROM members WHERE phone_number = $1", [phone_number])
            const user = phoneNumberResult.rows[0];

            if (user == undefined || !user) {
                return res.status(404).json({
                    massage: 'Invalid login. Username or Phone Number not found!',
                    success: false
                })
            }
    
            // Check the role
            if (user.role !== role) {
                return res.status(404).json({
                    massage: 'Unauthorised access. Use the right login portal!',
                    success: false
                })
            }
    
            // User exists and is signing in from the right portal
            // Compare passwords
            let isMatch = await bcrypt.compare(password, user.password);
            if(isMatch) {
                // Sign in the token and issue it to the user
                let token = jwt.sign({
                    member_id: user.member_id,
                    role: user.role,
                    username: user.username,
                    phone_number: user.phone_number,
                    image_url: user.image_url
                }, SECRET, { expiresIn: "30 days"});
                let result = {
                    member_id: user.member_id,
                    username: user.username,
                    role: user.role,
                    phone_number: user.phone_number,
                    image_url: user.image_url,
                    token: `Bearer ${token}`,
                    expiresIn: 720
                };
                return res.status(201).json({
                    status: "success",
                    results: result.length,
                    data: {
                        ...result
                    }
                })
            } else {
                return res.status(403).json({
                    massage: "Incorrect Username/Phone number or Password",
                    success: false
                })
            }
        }
        if (user == undefined || !user) {
            return res.status(404).json({
                massage: 'Invalid login. Username or Phone Number not found!',
                success: false
            })
        }

        // Check the role
        if (user.role !== role) {
            return res.status(404).json({
                massage: 'Unauthorised access. Use the right login portal!',
                success: false
            })
        }

        // User exists and is signing in from the right portal
        // Compare passwords
        let isMatch = await bcrypt.compare(password, user.password);
        if(isMatch) {
            // Sign in the token and issue it to the user
            let token = jwt.sign({
                member_id: user.member_id,
                role: user.role,
                username: user.username,
                phone_number: user.phone_number,
                image_url: user.image_url
            }, SECRET, { expiresIn: "30 days"});
            let result = {
                member_id: user.member_id,
                username: user.username,
                role: user.role,
                phone_number: user.phone_number,
                image_url: user.image_url,
                token: `Bearer ${token}`,
                expiresIn: 720
            };
            return res.status(201).json({
                status: "success",
                results: result.length,
                data: {
                    ...result
                }
            })
        } else {
            return res.status(403).json({
                massage: "Incorrect Username/Phone number or Password",
                success: false
            })
        }
    } catch (err) {
        console.log(err);
        // return res.status(400).json({error: err.detail});
    }
    
    

}


const validateUsername = async (username) => {
    // Check if user is already in the database
    try{
        let user = await db.query("SELECT * FROM members WHERE username = $1", [username])
        return user.rows.length !== 0 ?  false : true;
    } catch (err) {
        console.log(err);
        // return res.status(400).json({error: err.detail});
    }
};

/** 
 * @DESC Passport middleware
*/

const userAuth = passport.authenticate('jwt', { session: false });

/** 
 * @DESC Check role middleware
*/
const checkRole = roles => (req, res, next) => {
    if (roles.includes(req.user.rows[0].role)) {
        return next();
    }
    return res.status(401).json({
        message:"Unauthorized",
        success: false
    });
};

const validatePhoneNumber = async (phone_number) => {
    // Check if phone number is already in the database
    try{
        let userPhone = await db.query("SELECT * FROM members WHERE phone_number = $1", [phone_number])
        return userPhone.rows.length !== 0 ?  false : true;
    } catch (err) {
        console.log(err);
        // return res.status(400).json({error: err.detail});
    }
};

const serializeUser = user => {
    return {
        member_id: user.member_id,
        username: user.username,
        phone_number: user.phone_number,
        role: user.role,
        image_url: user.image_url
    };
};

module.exports =  {
    userAuth,
    userRegister,
    userLogin,
    serializeUser,
    checkRole
};