convertToDec = function(foo) { return {"$add":[foo,NumberDecimal(0)]}; }

conf={ _id:"asya", "members" : [
		{
			"_id" : 0,
			"host" : "Asyas-MacBook-Pro.local:27011"
		},
		{
			"_id" : 1,
			"host" : "Asyas-MacBook-Pro.local:27022"
		},
		{
			"_id" : 2,
			"host" : "Asyas-MacBook-Pro.local:27033"
		}
]}

rsstatus = function () {
   var st=rs.status();
   for (i=0; i<st.members.length; i++) {
       delete(st.members[i].optime);
       delete(st.members[i].state);
       delete(st.members[i].uptime);
       delete(st.members[i].electionTime);
       delete(st.members[i].lastHeartbeat);
       delete(st.members[i].lastHeartbeatRecv);
       delete(st.members[i].lastHeartbeatMessage);
       delete(st.members[i].optime);
   }
   printjson(st);
}

po2 = function(n) {
   y=Math.floor(Math.log(n)/Math.log(2));
  return Math.pow(2,y+1); 
}

getDate = function(ts) {
    if (ts < 14043901530) return new Date(ts*1000);
    else return new Date(ts);
}

mDate=function (dt) {
     cmin = ""+dt.getUTCMinutes();
     csec = ""+dt.getUTCSeconds();
     cmon = ""+(dt.getUTCMonth()+1);
     cdat = ""+dt.getUTCDate();
     if (cmon.length==1) cmon="0"+cmon;
     if (cdat.length==1) cdat="0"+cdat;
     if (cmin.length==1) cmin="0"+cmin;
     if (csec.length==1) csec="0"+csec;
     return dt.getUTCFullYear() + "-" + cmon + "-" + dt.getUTCDate()+" "+dt.getUTCHours() + ":" + cmin + ":" + csec;
}

shortDate = function (dt) {
    return dt.getFullYear()+"/"+(dt.getMonth()+1)+"/"+dt.getDate()+" "+dt.getHours()+":"+dt.getMinutes()+":"+dt.getSeconds();
}

finddb = function (str) { 
       var dbs=[]; 
       db.getMongo().getDBs().databases.forEach(function(d) { 
            if (d.name.indexOf(str) != -1) dbs.push(d.name); 
       }); 
       return dbs; 
}

findcoll = function (str) {
        var dbs=[];
        db.getMongo().getDBs().databases.forEach(function(d) {
             if (d.name.indexOf(str) != -1) dbs.push(d.name);
             db.getSiblingDB(d.name).getCollectionNames().forEach(function(co) {
                 if (co.indexOf(str) != -1) dbs.push(d.name + "." + co);
             });
       });
       return dbs;
}

prompt = function() {
    var state = "local";
    var version = db.version();
    var getMongo = db.getMongo();
    var replPrompt = defaultPrompt();
    if (db.version() < '2.5.5') replPrompt = replSetMemberStatePrompt();
    host=getMongo.host.split(':')[0];
    port=getMongo.host.split(':')[1];
    if (port == undefined) port="27017";
    if (replPrompt == "> ") {
        if (host.slice(-5) == "local") {
            state = "local";
        } else {
            state = host;
        }
    } else {
        state = replPrompt.slice(0,-2);
    }

    return db + "@" + state + ":" + port + "(" + version + ") > ";
}

count = function(ns, key) {
   var arr = [];
   group = {};
   dollarkey = "$" + key;
   group["$group"] = {"_id":dollarkey, "sum":{"$sum":1} }
   arr.push(group);
   arr.push({ "$sort": { sum : -1 } });
   return db.runCommand({"aggregate":ns,"pipeline":arr});
}

getLastOplog = function (limit, ns, op) {
   arg={};
   if (ns) arg["ns"]=ns;
   if (op) arg["op"]=op;
   lim=1;
   if (limit && typeof(limit)=="number") lim=limit;
   return db.getSiblingDB("local").oplog.rs.find(arg).sort({$natural:-1}).limit(lim);
}

StopWatch = function() {
    this.startMilliseconds = 0;
    this.elapsedMilliseconds = 0;
}

StopWatch.prototype.start = function() {
    this.startMilliseconds = new Date().getTime();
}

StopWatch.prototype.stop = function() {
    this.elapsedMilliseconds = new Date().getTime() - this.startMilliseconds;
}

printSizes = function () {
    if (arguments.length > 0) {
            print("printCollectionStats() has no optional arguments");
            return;
        }
    print("Collection \t\t   Count  \t\t     avgObjectSize   \t   Total size in  MBs ");
    var mydb = db;
    db.getCollectionNames().forEach(function(z) {
              if (z.lastIndexOf("system.",0)===0) return;
              print(z + Array((40-z.length)).join(' ') +" \t " + mydb.getCollection(z).count() + "   \t   \t " + mydb.getCollection(z).stats().avgObjSize + " \t " + mydb.getCollection(z).stats(1024*1024).size);
     }); 
}

printOneAll = function () {     
       if (arguments.length > 0) {
           print("printCollectionStats() has no optional arguments");
           return;     
       }  
       var mydb = db;
       db.getCollectionNames().forEach(function(z) {
             if (z.lastIndexOf("system.",0)===0) return;
             print(z + Array((40-z.length)).join(' ') +" \t " + mydb.getCollection(z).count());
             if (Object.bsonsize(mydb.getCollection(z).findOne()) < 1000) printjson(mydb.getCollection(z).findOne());
       });  
}

findValidators = function () {
    var dbs=[];     
    db.getMongo().getDBs().databases.forEach(function(d) {
        db.getSiblingDB(d.name).getCollectionInfos({"options.validator":{$exists:true}}).forEach(function(co) {
            print(d.name + "." + co.name);
            print(tojson(co.options.validator));
        });    
    }); 
}

makeCents = function(input) {
    return {$let:{
        vars: {
            dc:{$split:[{$toString:{$add:[input,NumberDecimal(".00")]}},"."]}},
        in: {
            $concat:[
                {$arrayElemAt:["$$dc",0]},
                ".",
                {$substr:[{$arrayElemAt:["$$dc",1]},0,2]}
            ]
        }
    }};
}

printDBSizes = function (str) {
  var dbs=[];
  db.getMongo().getDBs().databases.forEach(function(d) {
    if (d.name.indexOf(str) != -1) {
        printjson(db.getSiblingDB(d.name).stats(1024*1024*1024));
    }
 });
}

var runPing = function(iterations) {
    var start = Date.now();
    for (i = 0; i < iterations; i++) {
        res = db.runCommand({"ping": 1});
    }
    var end = Date.now();
    return end-start;
};

var runQuery = function(coll, query, iterations=1) {
    var start = Date.now();
    for (i = 0; i < iterations; i++) {
        res = db.getCollection(coll).find(query).toArray();
    }
    var end = Date.now();
    return end-start;
};

var getFieldFrom = function (f, o="$$ROOT") {
    return {$arrayElemAt:[ 
              {$map:{
                   input:{$filter:{
                           input:{$objectToArray:o},
                           cond:{$eq:["$$this.k", f]}
                   }},
                in:"$$this.v"
              }},
              0
    ]};
};

var getKeys = function (obj) {
   return {$map:{input:{$objectToArray:obj}, in: "$$this.k"}}; 
};

/* assuming identical fields in objects and all are numeric */
var mergeAddObjects = function ( obj1, obj2 ) {
    return {$arrayToObject:{$map:{
          input: getKeys(obj1),
          as: k,
          in: {
             k : "$$k",
             v : {$add: [ 
                getFieldFrom("$$k", obj1),
                getFieldFrom("$$k", obj2)
             ]}
          }
    }}};
};

var stripZeros = function(obj) {
    return {$arrayToObject:{$filter:{input:{$objectToArray:obj}, cond:{$ne:["$$this.v",0]}}}}
};

var unorderedEq = function(o1, o2) {
    return {$eq: [
       {$arrayToObject:{$setUnion:[{$objectToArray:o1}]}},
       {$arrayToObject:{$setUnion:[{$objectToArray:o2}]}}
    ] };
};

var normalize = function(o) {
    return {"$arrayToObject" : {"$setUnion" : [ {"$objectToArray" : o}]}}
}

var diff2obj=function(o1, o2) { 
    return {$arrayToObject:{$map:{input:getKeys(o1), as:"key", in: { k: "$$key", v: {$subtract:[{$ifNull:[getField(o1, "$$key"),0]}, {$ifNull:[getField(o2, "$$key"),0]}]}}}}}; 
};

var add2obj=function(o1, o2) { 
   return {$arrayToObject:{$map:{input: getKeys(o1), as:"key", in: { k: "$$key", v: {$add:[{$ifNull:[getField(o1, "$$key"),0]}, {$ifNull:[getField(o2, "$$key"),0]}]}}}}}; 
};

subtract2numbers = function(a) { 
   return {$subtract:[{$arrayElemAt:[a,0]},{$arrayElemAt:[a,1]}]}
}
var to=new Date().getTime();
var from=to-1000*60*60*48;
