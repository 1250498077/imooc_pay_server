/**
 * Mongodb公共文件，统一操作数据库
 */
let MongoClient = require('mongodb').MongoClient;
let util = require('./../../util/util')
let url = "mongodb://127.0.0.1:27018/imooc_pay"

// 查询数据
exports.query = function (data,table) {
  return new Promise((resolve,reject)=>{
    connect(function(dbase,db){
      dbase.collection(table).find(data).toArray(function(err,res){
        if(err){
          throw err;
        }else{
          db.close();
          resolve(util.handleSuc(res))
        }
      })
    })
  })
}
// 插入数据
exports.insert = function (data, table) {
  return new Promise((resolve, reject) => {
    connect(function (dbase, db) {
      dbase.collection(table).insertOne(data,function (err, res) {
        if (err) {
          throw err;
        } else {
          db.close();
          resolve(util.handleSuc(res))
        }
      })
    })
  })
}
// 数据库连接
function connect(callbck){
  MongoClient.connect(url,function (err,db) {
    if(err) throw err;
    let dbase = db.db('imooc_pay');
    callbck(dbase,db);
  })
}