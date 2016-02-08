/**
 * Created by phuongnguyen on 2/02/16.
 */

module.exports = function findForRequest(app) {
    console.log('Initializing findForRequest for models');
    var AccessToken = app.models.AccessToken;
    AccessToken.findForRequest = function(req, options, cb) {
        if (cb === undefined && typeof options === 'function') {
            cb = options;
            options = {};
        }
        var id = tokenIdForRequest(req, options);
        var tokenId = tokenIdForRequest(req, options);
        console.log("modified -> AccessToken.findForRequest begin ......<<<<<<<<<<<<<<>>>>>>>>>>>>>>tokenId=",tokenId);
        if (id) {


            var ds = AccessToken.app.loopback.createDataSource({
                connector: require("loopback-connector-rest"),
                debug: false,
                baseURL: 'http://localhost:8001/api'
            });

            //http://localhost:8001/api/AccessTokens

            var assessToken = ds.createModel('AccessTokens',{id:String,ttl:Number,created:Date,userId:Number});

            assessToken.find({filter:{where:{id:tokenId}}}, function (err, assessTokenObjects) {

                if(assessTokenObjects.length > 0){
                    var assessTokenObject = {};
                    assessTokenObject.ttl = assessTokenObjects[0].ttl;
                    assessTokenObject.created = assessTokenObjects[0].created;
                    assessTokenObject.userId = assessTokenObjects[0].userId;
                    assessTokenObject.id = tokenId;
                    console.log(" modified ->  assessToken.find = ",id,err, assessTokenObject);

                    if (err) {
                        cb(err);
                    } else if (assessTokenObject) {

                        var now = Date.now();
                        var created = new Date(assessTokenObject.created);
                        var elapsedSeconds = (now - created) / 1000;
                        var secondsToLive = assessTokenObject.ttl;
                        var isValid = elapsedSeconds < secondsToLive;

                        console.log(" <><><<><><> modified ->  now =",now," created = ",created," elapsedSeconds=",elapsedSeconds,"secondsToLive =",secondsToLive,"isValid=",isValid);

                        if (isValid) {
                            cb(null, assessTokenObject);
                        } else {
                            var e = {};
                            e.msg = 'Token Time Out';
                            e.status = 401;
                            e.statusCode = 401;
                            e.code = 'TOKEN_TIME_OUT';
                            cb(e, null);
                        }
                    } else {
                        cb();
                    }

                }else{
                    console.log(" No assess token return !");
                    var e = {};
                    e.msg = 'Invalid Access Token';
                    e.status = 401;
                    e.statusCode = 401;
                    e.code = 'INVALID_TOKEN';
                    cb(null,null);
                }
            });

        } else {
            process.nextTick(function() {
                cb();
            });
        }
    };

    function tokenIdForRequest(req, options) {
        var params = options.params || [];
        var headers = options.headers || [];
        var cookies = options.cookies || [];
        var i = 0;
        var length;
        var id;

        // https://github.com/strongloop/loopback/issues/1326
        if (options.searchDefaultTokenKeys !== false) {
            params = params.concat(['access_token']);
            headers = headers.concat(['X-Access-Token', 'authorization']);
            cookies = cookies.concat(['access_token', 'authorization']);
        }

        for (length = params.length; i < length; i++) {
            var param = params[i];
            // replacement for deprecated req.param()
            id = req.params && req.params[param] !== undefined ? req.params[param] :
                    req.body && req.body[param] !== undefined ? req.body[param] :
                    req.query && req.query[param] !== undefined ? req.query[param] :
                undefined;

            if (typeof id === 'string') {
                return id;
            }
        }

        for (i = 0, length = headers.length; i < length; i++) {
            id = req.header(headers[i]);

            if (typeof id === 'string') {
                // Add support for oAuth 2.0 bearer token
                // http://tools.ietf.org/html/rfc6750
                if (id.indexOf('Bearer ') === 0) {
                    id = id.substring(7);
                    // Decode from base64
                    var buf = new Buffer(id, 'base64');
                    id = buf.toString('utf8');
                } else if (/^Basic /i.test(id)) {
                    id = id.substring(6);
                    id = (new Buffer(id, 'base64')).toString('utf8');
                    // The spec says the string is user:pass, so if we see both parts
                    // we will assume the longer of the two is the token, so we will
                    // extract "a2b2c3" from:
                    //   "a2b2c3"
                    //   "a2b2c3:"   (curl http://a2b2c3@localhost:3000/)
                    //   "token:a2b2c3" (curl http://token:a2b2c3@localhost:3000/)
                    //   ":a2b2c3"
                    var parts = /^([^:]*):(.*)$/.exec(id);
                    if (parts) {
                        id = parts[2].length > parts[1].length ? parts[2] : parts[1];
                    }
                }
                return id;
            }
        }

        if (req.signedCookies) {
            for (i = 0, length = cookies.length; i < length; i++) {
                id = req.signedCookies[cookies[i]];

                if (typeof id === 'string') {
                    return id;
                }
            }
        }
        return null;
    }
}

