import jwt from 'jsonwebtoken';

const auth = async (req, res, next) => {
    try {
        // TODO: Deal with user without logging in?
        if (req.headers["authorization"]) {
            console.log(req.headers["authorization"]);
            const token = req.headers["authorization"].split(" ")[1];
    
            let decodedData;
            if (token) {
                
                decodedData = jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
                    if (err) {
                        if (err.name) {
                            if (err.name == 'TokenExpiredError') {
                                res.status(500).json({ message: err.name });
                                return;
                            }
                        }
                        //res.status(500).json({ message: err.name });
                    } else {
                        req.userId = decoded?.id;
                    }
                });
            } else {
                decodedData = jwt.decode(token);
                req.userId = decodedData?.sub;
            }
        }

        next();
    } catch (error) {
        console.log(error);
        const errorName = error.name;
        if (errorName) {
            if (errorName == 'TokenExpiredError') {
                res.status(500).json({ message: errorName });
            }
        }
    }
}

export default auth;