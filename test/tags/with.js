var altr = require('../../lib')
var test = require('tape')

test('with tag', function (t) {
  var template = altr(
    '<div altr-with="a as val"><div altr-text="val.content"></div></div>',
    {a: {content: 'hi!!!'}},
    {sync: true}
  )

  t.plan(1)
  t.equal(
    template.toString(),
    '<div altr-with="a as val"><div altr-text="val.content">hi!!!</div></div>'
  )
})
