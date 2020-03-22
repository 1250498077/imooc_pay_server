var express = require('express');
var router = express.Router();
var dao = require('./common/db')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express4' });
});

router.get('/query',async function (req,res,next) {
  let data = await dao.query({id:100},'users');
  res.json(data);
})

module.exports = router;
