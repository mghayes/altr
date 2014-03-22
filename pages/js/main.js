var altr = require('../../lib/browser')
  , concat = require('concat-stream')
  , parse_md = require('./parse-md')
  , headings = require('./headings')
  , routes = require('./routes')
  , http = require('http')

var main_template = altr(document.body)
  , context = {}

context.headings = headings
context.current_path = window.location.pathname

load_route(context.current_path)

main_template.update(context)

document.addEventListener('click', on_click)

function load_route(path) {
  var file = routes[path]

  if(!file) {
    return not_found
  }

  context.file = file
  http.get({path: file}, function(res) {
    res.pipe(concat(on_file.bind(null, res))).on('error', on_error)
  }).on('error', on_error)
}

function on_file(res, file) {
  if(res.statusCode > 400) {
    return not_found()
  }

  context.content = parse_md(file)
  main_template.update(context)
}

function on_error(err) {
  console.log(err)
}

function not_found() {
  console.log('could not load ', context.file)
}

function on_click(ev) {
  if(ev.target.getAttribute('rel') === 'altr') {
    ev.preventDefault()
    set_route(ev.target.getAttribute('href'))
  }
}

function set_route(path) {
  if(context.current_path === path) {
    return
  }

  window.history.pushState(null, 'Altr', path)
  context.current_path = path
  load_route(path)
  main_template.update(context)
}
