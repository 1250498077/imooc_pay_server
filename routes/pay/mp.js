let express = require('express');
let router = express.Router();
let request = require('request');
let config = require('./config');
let util = require('./../../util/util')
let dao = require('./../common/db')
let wxpay = require('./../common/wxpay')
config = Object.assign({}, config.mp);
// 获取session接口
router.get('/getSession',function(req,res){
  let code = req.query.code;
  if(!code){
    res.json(util.handleFail('code不能为空',10001));
  }else{
    let sessionUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.appId}&secret=${config.appSecret}&js_code=${code}&grant_type=authorization_code`;
    request(sessionUrl,function(err,response,body){
      let result = util.handleResponse(err, response, body);
      res.json(result);
    })
  }
})
// 小程序授权登录
router.get('/login',async function(req,res){
  let userInfo = JSON.parse(req.query.userInfo);
  if (!userInfo){
    res.json(util.handleFail('用户信息不能为空',10002))
  }else{
    // 查询当前用户是否已经注册
    let userRes = await dao.query({ openid: userInfo.openid},'users_mp');
    if (userRes.code == 0){
      if (userRes.data.length >0){
        res.json(util.handleSuc({
          userId: userRes.data[0]._id
        }))
      }else{
        let insertData = await dao.insert(userInfo,'users_mp');
        if (insertData.code == 0){
          let result = await dao.query({ openid: userInfo.openid }, 'users_mp');
          res.json(util.handleSuc({
            userId: result.data[0]._id
          }))
        }else{
          res.json(insertData);
        }
      }
    }else{
      res.json(userRes);
    }
  }
})
// 支付回调通知
router.get('/pay/callback',function(req,res){
  res.json(util.handleSuc());
})
// 小程序支付
router.get('/pay/payWallet',function(req,res){
  let openId = req.query.openId;//用户的openid
  let appId = config.appId;//应用的ID
  let attach = "小程序支付课程体验";//附加数据
  let body = "欢迎学习慕课首门支付专项课程";//支付主体内容
  let total_fee = req.query.money;//支付总金额
  let notify_url = "http://localhost:3000/api/mp/pay/callback"
  let ip = "123.57.2.144";
  wxpay.order(appId,attach,body,openId,total_fee,notify_url,ip).then((result)=>{
    res.json(util.handleSuc(result));
  }).catch((result)=>{
    res.json(util.handleFail(result.toString()))
  });
})
// 手机号授权解密
router.get('/pay/getPhoneNumber',function(req,res){
  let {session_key,iv,encryptedData} = req.query;
  var pc = new WXBizDataCrypt(config.appId, session_key)

  var data = pc.decryptData(encryptedData , iv)
  res.json(util.handleSuc(data));
})
module.exports = router;