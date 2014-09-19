(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var extend = require('extend')

module.exports = altrExtend

function altrExtend(base, options) {
  var baseOptions = extend(true, base, options)
  var altr = this

  extension.render = altr.render.bind(altr, baseOptions)
  extension.extend = altr.extend.bind(altr)
  extension.addTag = altr.addTag.bind(altr)
  extension.include = altr.include.bind(altr)
  extension.addFilter = altr.addFilter.bind(altr)
  extension.addDecorator = altr.addDecorator.bind(altr)

  return extension

  function extension(root, state, options) {
    return new altr(root, state, extend(
        true
      , Object.create(baseOptions)
      , options || {}
    ))
  }
}
},{"extend":48}],2:[function(require,module,exports){
(function (global){
var EE = require('events').EventEmitter
var batch = require('batch-queue')
var dirtybit = require('dirtybit')
var extend = require('extend')

var templateString = require('./template-string')
var elementNode = require('./element-node')
var mergeHooks = require('./merge-hooks')
var altrExtend = require('./altr-extend')
var textNode = require('./text-node')
var toString = require('./to-string')
var runHooks = require('./run-hooks')
var getEl = require('./get-element')
var destroy = require('./destroy')
var render = require('./render')
var remove = require('./remove')
var raf = require('./raf')

// dynamic require so it does not make it into the browserify bundle
var domModule = 'micro-dom'

module.exports = altr

altr.filters = {}
altr.includes = {}
altr.decorators = {}

altr.render = render
altr.addTag = addTag
altr.include = include
altr.extend = altrExtend
altr.addFilter = addFilter
altr.addDecorator = addDecorator

function altr(root, data, options) {
  if(!(this instanceof altr)) {
    return new altr(root, data, options)
  }

  var options = options || {}

  this.filters = extend(
      false
    , Object.create(altr.filters)
    , options.filters || {}
  )

  this.decorators = extend(
      false
    , Object.create(altr.decorators)
    , options.decorators || {}
  )

  this.includes = extend(
      false
    , Object.create(altr.includes)
    , options.includes || {}
  )

  this.root = root
  this.sync = !!options.sync
  this.tagRegExp = makeTagRegExp(options.delimiters)
  this.document = options.doc || global.document || require(domModule).document
  this.lookups = dirtybit(data, {filters: this.filters})

  this.batch = batch((function() {
    if(!this.sync) {
      raf(this.runBatch.bind(this))
    }
  }).bind(this))

  if(global.Buffer && root instanceof global.Buffer) {
    root = root.toString()
  }

  if(typeof root === 'string') {
    var temp = this.document.createElement('div')

    temp.innerHTML = root
    this.root = this.document.createDocumentFragment()

    while(temp.firstChild) {
      this.root.appendChild(temp.firstChild)
    }
  }

  this.children = this.initNodes(this.rootNodes(), this.lookups)
  this.runHooks(this.children.hooks, 'insert', null)
  this.runBatch()
}

altr.prototype = Object.create(EE.prototype)
altr.prototype.constructor = altr

altr.prototype.templateString = templateString
altr.prototype.addDecorator = addDecorator
altr.prototype.mergeHooks = mergeHooks
altr.prototype.initNodes = initNodes
altr.prototype.rootNodes = rootNodes
altr.prototype.addFilter = addFilter
altr.prototype.runBatch = runBatch
altr.prototype.toString = toString
altr.prototype.runHooks = runHooks
altr.prototype.getElement = getEl
altr.prototype.include = include
altr.prototype.destroy = destroy
altr.prototype.remove = remove
altr.prototype.into = appendTo
altr.prototype.update = update
altr.prototype.tagList = []
altr.prototype.tags = {}

var node_handlers = {}

node_handlers[1] = elementNode
node_handlers[3] = textNode

function update(data, sync) {
  this.state = data
  this.lookups.update(data)

  if(sync || this.sync) {
    this.runBatch()
  }
}

function initNodes(_nodes, _lookups, state) {
  var altr = this
  var lookups = _lookups || dirtybit(state, {filters: this.filters})
  var nodes = Array.prototype.slice.call(_nodes)
  var hooks = nodes.reduce(join, []).filter(Boolean)

  return {hooks: hooks, lookups: lookups, nodes: nodes}

  function join(list, node) {
    var hooks = initNode.call(altr, lookups, node)

    return hooks ? list.concat(hooks) : list
  }
}

function initNode(lookups, el) {
  return node_handlers[el.nodeType] ?
    node_handlers[el.nodeType].call(this, el, lookups) :
    el.childNodes && el.childNodes.length ?
    this.initNodes(lookups, el.childNodes) :
    null
}

function rootNodes() {
  return this.root.nodeType === this.document.DOCUMENT_FRAGMENT_NODE ?
    [].slice.call(this.root.childNodes) :
    [this.root]
}

function addFilter(name, filter) {
  this.filters[name] = filter
}

function addTag(attr, tag) {
  this.prototype.tags[attr] = tag
  this.prototype.tagList.push({
      attr: attr
    , constructor: tag
  })
}

function appendTo(node) {
  var rootNodes = this.rootNodes()

  for(var i = 0, l = rootNodes.length; i < l; ++i) {
    node.appendChild(getEl(rootNodes[i]))
  }
}

function include(name, template) {
  return this.includes[name] = template
}

function addFilter(name, fn) {
  return this.filters[name] = fn
}

function addDecorator(name, fn) {
  return this.decorators[name] = fn
}

function runBatch() {
  this.batch.run() && this.emit('update', this.state)
}

function makeTagRegExp(_delimiters) {
  var delimiters = _delimiters || ['{{', '}}']

  return new RegExp(delimiters[0] + '\\s*(.*?)\\s*' + delimiters[1])
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./altr-extend":1,"./destroy":6,"./element-node":7,"./get-element":8,"./merge-hooks":10,"./raf":11,"./remove":12,"./render":13,"./run-hooks":14,"./template-string":25,"./text-node":26,"./to-string":27,"batch-queue":28,"dirtybit":32,"events":29,"extend":48}],3:[function(require,module,exports){
module.exports.raw = rawAttribute
module.exports.altr = altrAttribute
module.exports.prop = altrProperty

function rawAttribute(el, attr, lookups) {
  this.templateString(
      attr.value
    , this.batch.add(el.setAttribute.bind(el, attr.name))
    , lookups
  )
}

function altrAttribute(el, attr, lookups) {
  var name = attr.name.slice('altr-attr-'.length)

  lookups.on(attr.value, this.batch.add(update))
  el.removeAttribute(attr.name)

  function update(val) {
    if(!val && val !== '' && val !== 0) {
      return el.removeAttribute(name)
    }

    el.setAttribute(name, val)
  }
}

function altrProperty(el, attr, lookups) {
  var name = attr.name.slice('altr-prop-'.length)

  el.removeAttribute(attr.name)
  lookups.on(attr.value, this.batch.add(update))

  function update(val) {
    el[name] = val
  }
}

},{}],4:[function(require,module,exports){
(function (global){
module.exports = global.altr = require('./index')

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./index":9}],5:[function(require,module,exports){
module.exports = decorators

function decorators(el, attrs, lookups) {
  var altr = this
  var hooks = []

  return attrs.map(createDecorator)

  function createDecorator(attr) {
    var decorator = altr.decorators[attr.name].call(altr, el)
    var expression = '[' + attr.value + ']'

    if(!decorator) {
      return
    }

    var hooks = {insert: decorator.insert, remove: decorator.remove}

    if(decorator.update) {
      lookups.on(expression, update)
    }

    hooks.destroy = destroy

    return hooks

    function destroy() {
      lookups.removeListener(expression, update)

      if(decorator.destroy) {
        decorator.destroy()
      }
    }

    function update(args) {
      decorator.update.apply(null, args)
    }
  }
}

},{}],6:[function(require,module,exports){
module.exports = destroy

function destroy(children, el, done) {
  var altr = this

  altr.remove(children, el, function(el) {
    altr.runHooks(children, 'destroy', el)
    done()
  })
}

},{}],7:[function(require,module,exports){
var createDecorators = require('./decorators')
  , createAttr = require('./attributes')

module.exports = createElementNode

function createElementNode(el, lookups) {
  var decorators = []
  var altr = this
  var attr

  var attrs = Array.prototype.slice.call(el.attributes)
  var decorators = []
  var altr_tags = {}
  var tags = {}

  for(var i = 0, l = attrs.length; i < l; ++i) {
    if(altr.tags[attrs[i].name]) {
      altr_tags[attrs[i].name] = attrs[i].value
    } else if(altr.decorators[attrs[i].name]) {
      decorators.push(attrs[i])
    } else if(!attrs[i].name.lastIndexOf('altr-attr-', 0)) {
      createAttr.altr.call(this, el, attrs[i], lookups)
    } else if(!attrs[i].name.lastIndexOf('altr-prop-', 0)) {
      createAttr.prop.call(this, el, attrs[i], lookups)
    } else {
      createAttr.raw.call(this, el, attrs[i], lookups)
    }
  }

  var hooks = createDecorators.call(altr, el, decorators, lookups)

  for(var i = 0, l = altr.tagList.length; i < l; ++i) {
    if(attr = altr_tags[altr.tagList[i].attr]) {
      return hooks.concat([
          altr.tagList[i].constructor.call(altr, el, attr, lookups, hooks) || {}
      ])
    }
  }

  return hooks.concat(altr.initNodes(el.childNodes, lookups).hooks)
}

},{"./attributes":3,"./decorators":5}],8:[function(require,module,exports){
module.exports = get

function get(_el) {
  var el = _el

  while(el && el._altrPlaceholder) {
    el = el._altrPlaceholder

    if(el === _el) {
      throw new Error('placeholder circular refference')
    }
  }

  return el
}

},{}],9:[function(require,module,exports){
var placeholder = require('./tags/placeholder')
  , childrenTag = require('./tags/children')
  , includeTag = require('./tags/include')
  , textTag = require('./tags/text')
  , htmlTag = require('./tags/html')
  , withTag = require('./tags/with')
  , forTag = require('./tags/for')
  , rawTag = require('./tags/raw')
  , ifTag = require('./tags/if')
  , altr = require('./altr')

module.exports = altr

altr.addTag('altr-children', childrenTag)
altr.addTag('altr-replace', placeholder)
altr.addTag('altr-include', includeTag)
altr.addTag('altr-text', textTag)
altr.addTag('altr-html', htmlTag)
altr.addTag('altr-with', withTag)
altr.addTag('altr-for', forTag)
altr.addTag('altr-raw', rawTag)
altr.addTag('altr-if', ifTag)

},{"./altr":2,"./tags/children":16,"./tags/for":17,"./tags/html":18,"./tags/if":19,"./tags/include":20,"./tags/placeholder":21,"./tags/raw":22,"./tags/text":23,"./tags/with":24}],10:[function(require,module,exports){
module.exports = merge

function merge(children) {
  var altr = this

  return {
      insert: each.bind(null, 'insert')
    , destroy: each.bind(null, 'destroy')
    , remove: remove
  }

  function each(type, el) {
    var nodes = children()

    for(var i = 0, l = nodes.length; i < l; i++) {
      nodes[i][type] && nodes[i][type](el)
    }
  }

  function remove(el, ready) {
    altr.remove(children(), el, ready)
  }
}
},{}],11:[function(require,module,exports){
(function (global){
module.exports = requestAnimationFrame

function requestAnimationFrame(callback) {
  var raf = global.requestAnimationFrame ||
    global.webkitRequestAnimationFrame ||
    global.mozRequestAnimationFrame ||
    timeout

  return raf(callback)

  function timeout(callback) {
    return setTimeout(callback, 1000 / 60)
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],12:[function(require,module,exports){
module.exports = remove

function remove(hooks, el, ready) {
  var remaining = hooks.length
  var c = 0

  for(var i = 0, l = remaining; i < l; i++) {
    hooks[i].remove ? hooks[i].remove(el, done) : --remaining
  }

  if(!remaining) {
    ready()
  }

  function done() {
    if(!--remaining) {
      remaining = -1
      ready()
    }
  }
}
},{}],13:[function(require,module,exports){
module.exports = render

function render(template, state, el) {
  if(this.includes[template]) {
    template = this.includes[template]
  }

  var instance = this(template)

  instance.update(state || {}, true)

  if(el) {
    instance.into(el)
  }

  return instance
}

},{}],14:[function(require,module,exports){
module.exports = runHooks

function runHooks(hooks, type, el) {
  for(var i = 0, l = hooks.length; i < l; i++) {
    hooks[i][type] && hooks[i][type](el)
  }
}

},{}],15:[function(require,module,exports){
var get = require('./get-element')

module.exports = setChildren

function setChildren(root, nodes) {
  var prev = null
    , el

  for(var i = nodes.length - 1; i >= 0; --i) {
    el = get(nodes[i])
    root.insertBefore(el, prev)
    prev = el
  }

  while((el = root.firstChild) !== prev) {
    root.removeChild(el)
  }
}

},{"./get-element":8}],16:[function(require,module,exports){
var setChildren = require('../set-children')

module.exports = children

function children(el, getter, lookups) {
  var current = []

  el.innerHTML = ''
  this.batch.add(lookups.on(getter, update.bind(this)))

  function update(val) {
    var nodes = (Array.isArray(val) ? val : [val]).filter(is_node)

    for(var i = 0, l = nodes.length; i < l; ++i) {
      if(nodes[i] !== current[i]) {
        break
      }
    }

    if(i === nodes.length === current.length) {
      return
    }

    current = nodes
    setChildren.call(this, el, current)
  }
}

function is_node(el) {
  return el && el.nodeType
}

},{"../set-children":15}],17:[function(require,module,exports){
var setChildren = require('../set-children')
var forRegexp = /^(.*?)\s+in\s+(.*$)/

module.exports = forHandler

function forHandler(root, args, lookups) {
  var template = root.cloneNode(true)
  var parts = args.match(forRegexp)
  var domNodes = []
  var children = []
  var altr = this
  var items = []

  if(!parts) {
    return console.error('invalid `for` tag: ' + args)
  }

  var runUpdates = altr.batch.add(runDomUpdates)

  root.innerHTML = ''

  var unique = parts[1].split(':')[1]
  var prop = parts[1].split(':')[0]
  var key = parts[2]


  lookups.on(key, update)

  return altr.mergeHooks(function() {
    return flatten(children)
  })

  function updateChildren(data) {
    var itemData

    for(var i = 0, l = children.length; i < l; ++i) {
      itemData = Object.create(data)
      itemData[prop] = items[i]
      itemData['$index'] = i
      children[i].lookups.update(itemData)
    }
  }

  function update(newItems) {
    if(!Array.isArray(newItems)) {
      newItems = []
    }

    var newChildren = new Array(newItems.length)
    var removed = []
    var matched = {}
    var added = []
    var index

    domNodes = []

    for(var i = 0, l = newItems.length; i < l; ++i) {
      index = findIndex(items, newItems[i], unique)

      if(index !== -1) {
        newChildren[i] = children[index]
        items[index] = children[index] = matched
      } else {
        added.push(newChildren[i] = makeChild())
      }

      domNodes = domNodes.concat(newChildren[i].nodes)
    }

    for(var i = 0, l = children.length; i < l; ++i) {
      if(children[i] !== matched) {
        removed.push(children[i])
      }
    }

    children = newChildren.slice()
    items = newItems.slice()
    updateChildren(lookups.state)
    altr.destroy(flatten(removed), root, runUpdates.bind(
        altr
      , domNodes
      , flatten(added)
    ))
  }

  function findIndex(items, d, unique) {
    if(!unique) {
      return items.indexOf(d)
    }

    for(var i = 0, l = items.length; i < l; ++i) {
      if(items[i][unique] === d[unique]) {
        return i
      }
    }

    return -1
  }

  function makeChild() {
    return altr.initNodes(template.cloneNode(true).childNodes)
  }

  function runDomUpdates(children, added) {
    setChildren.call(this, root, children)
    altr.runHooks(added, 'insert', root)
  }
}

function flatten(list) {
  return list.reduce(function(all, part) {
    return part.hooks ? all.concat(part.hooks) : all
  }, [])
}
},{"../set-children":15}],18:[function(require,module,exports){
module.exports = html

function html(el, accessor, lookups) {
  this.batch.add(lookups.on(accessor, update))

  function update(val) {
    el.innerHTML = typeof val === 'undefined' ? '' : val

    if(el.getAttribute('altr-run-scripts')) {
      [].forEach.call(el.getElementsByTagName('script'), run)
    }
  }
}

function run(script) {
  var fixed = document.createElement('script')
    , parent = script.parentNode
    , attrs = script.attributes
    , src

  for(var i = 0, l = attrs.length; i < l; ++i) {
    fixed.setAttribute(attrs[i].name, attrs[i].value)
  }

  fixed.textContent = script.textContent
  parent.insertBefore(fixed, script)
  parent.removeChild(script)
}

},{}],19:[function(require,module,exports){
module.exports = ifTag

function ifTag(el, getter, lookups, decorators) {
  var placeholder = this.document.createComment('altr-if-placeholder')
  var children = this.initNodes(el.childNodes)
  var all = children.hooks.concat(decorators)
  var lastVal = null
  var hidden = null
  var first = true
  var altr = this

  var update = this.batch.add(function(show, origin) {
    if(!hidden && !show) {
      el.parentNode.replaceChild(placeholder, el)
      el._altrPlaceholder = placeholder
      hidden = true
    } else if(hidden && show) {
      placeholder.parentNode.replaceChild(el, placeholder)
      altr.runHooks(all, 'insert', origin)
      delete el._altrPlaceholder
      hidden = false
    } else if(first) {
      first = false
      altr.runHooks(all, 'insert', origin)
    }
  })

  lookups.on(getter, toggle, true)

  return {
      insert: insert
    , remove: remove
    , destroy: destroy
  }

  function destroy(el) {
    altr.runHooks(children.hooks, 'destroy', el)
  }

  function toggle(val) {
    lastVal = val

    if(val) {
      update(true, el)
      children.lookups.update(lookups.state)
    } else {
      altr.remove(all, el, function() {
        return update(false, el)
      })
    }
  }

  function insert(el) {
    if(lastVal) {
      update(true, el)
    }
  }

  function remove(el, done) {
    if(hidden) {
      done()

      return update(false)
    }

    altr.remove(children.hooks, el, function() {
      update(false)
      done()
    })
  }
}


},{}],20:[function(require,module,exports){
module.exports = include

function include(el, name, lookups) {
  var removing = false
  var children = null
  var altr = this

  lookups.on('this', update)

  return {insert: insert, remove: remove, destroy: destroy}

  function insert() {
    if(children) {
      return
    }

    el.innerHTML = altr.includes[name]
    children = altr.initNodes(el.childNodes, null, lookups.state)
  }

  function remove(el, done) {
    if(!children || removing) {
      return
    }

    children = null
    removing = true
    altr.destroy(children, el, function() {
      removing = false

      if(!children) {
        el.innerHTML = ''
      }

      done()
    })

  }

  function update(state) {
    children && children.lookups.update(state)
  }

  function destroy() {
    lookups.removeListener('this', update)
  }
}

},{}],21:[function(require,module,exports){
module.exports = placeholder

function placeholder(original, getter, lookups) {
  var current = original
    , altr = this

  this.batch.add(lookups.on(getter, update))

  function update(val) {
    if(!val || !val.nodeName || val === current) {
      return
    }

    current.parentNode.replaceChild(val, current)
    original._altrPlaceholder = val
    current = val
  }
}

},{}],22:[function(require,module,exports){
module.exports = function raw() {}

},{}],23:[function(require,module,exports){
module.exports = text

function text(el, getter, lookups) {
  this.batch.add(lookups.on(getter, update))

  function update(val) {
    el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],24:[function(require,module,exports){
module.exports = withTag

function withTag(el, getter, lookups) {
  var children = this.initNodes(el.childNodes)
    , parts = getter.split(' as ')

  lookups.on(parts[0], update)

  return children.hooks

  function update(_val) {
    var val = Object.create(lookups.state)

    val[parts[1]] = _val
    children.lookups.update(val)
  }
}

},{}],25:[function(require,module,exports){
module.exports = templatString

function templatString(template, change, lookups) {
  if(!template.match(this.tagRegExp)) {
    return
  }

  var remaining = template
    , parts = []
    , hooks = []
    , index
    , next

  while(remaining && (next = remaining.match(this.tagRegExp))) {
    if(index = remaining.indexOf(next[0])) {
      parts.push(remaining.slice(0, index))
    }

    parts.push('')
    remaining = remaining.slice(index + next[0].length)
    lookups.on(next[1], setPart.bind(this, parts.length - 1))
  }

  if(remaining) {
    setPart(parts.length, remaining)
  }

  function setPart(idx, val) {
    parts[idx] = val

    change(parts.join(''))
  }
}

},{}],26:[function(require,module,exports){
module.exports = initTextNode

function initTextNode(el, lookups) {
  this.templateString(
      el.textContent
    , this.batch.add(update)
    , lookups
  )

  function update(val) {
    el.textContent = val
  }
}

},{}],27:[function(require,module,exports){
module.exports = toString

function toString() {
  return this.rootNodes().map(function(node) {
    switch(node.nodeType) {
      case this.document.DOCUMENT_FRAGMENT_NODE:
      case this.document.COMMENT_NODE: return clone.call(this, node)
      case this.document.TEXT_NODE: return node.textContent
      default: return node.outerHTML
    }
  }, this).join('')

  function clone(node) {
    var temp = this.document.createElement('div')

    temp.appendChild(node.cloneNode(true))

    return temp.innerHTML
  }
}

},{}],28:[function(require,module,exports){
module.exports = Batch

function Batch(ready, all) {
  if(!(this instanceof Batch)) {
    return new Batch(ready, all)
  }

  this.jobs = []
  this.all = all
  this.ready = ready
  this.queud = false
  this.run = this.run.bind(this)
}

Batch.prototype.queue = queue
Batch.prototype.add = add
Batch.prototype.run = run

function add(fn) {
  var queued = false
    , batch = this
    , self
    , args

  return queue

  function queue() {
    args = [].slice.call(arguments)
    self = this

    if(queued) {
      return batch.all && batch.ready()
    }

    queued = true
    batch.queue(run)
  }

  function run() {
    queued = false
    fn.apply(self, args)
  }
}

function queue(fn) {
  this.jobs.push(fn)

  if(this.all || !this.queued) {
    this.queued = true
    this.ready(this)
  }
}

function run() {
  var jobs = this.jobs

  this.jobs = []
  this.queued = false

  for(var i = 0, l = jobs.length; i < l; ++i) {
    jobs[i]()
  }

  return !!jobs.length
}

},{}],29:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],30:[function(require,module,exports){
module.exports = Expression

function Expression(parsed, deps, value, handler) {
  this.dependents = []
  this.deps = deps
  this.parsed = parsed
  this.changed = false
  this.removable = true
  this.value = value
  this.update = update.bind(this)
  this.handler = handler

  for(var i = 0, l = deps.length; i < l; ++i) {
    deps[i].dependents.push(this)
  }
}

Expression.prototype.change = change
Expression.prototype.update = update

function change(val) {
  if(this.value === val && (!this.value || typeof this.value !== 'object')) {
    return
  }

  this.value = val
  this.changed = true

  for(var i = 0, l = this.dependents.length; i < l; ++i) {
    this.dependents[i].update()
  }
}

function update() {
  var args = new Array(this.deps.length)

  for(var i = 0, l = this.deps.length; i < l; ++i) {
    args[i] = this.deps[i].value
  }

  this.handler.apply(null, args)
}

},{}],31:[function(require,module,exports){
module.exports = hash

function hash(str) {
  var val = 0

  for(var i = 0, len = str.length; i < len; ++i) {
    val = ((val << 5) - val) + str.charCodeAt(i)
    val |= 0
  }

  return val.toString().replace('-', '_')
}

},{}],32:[function(require,module,exports){
var Expression = require('./expression')
var remove = require('./remove')
var types = require('./types')
var parse = require('./parse')
var split = require('./split')
var watch = require('./watch')
var hash = require('./hash')

module.exports = DirtyBit

function DirtyBit(state, options) {
  if(!(this instanceof DirtyBit)) {
    return new DirtyBit(state, options)
  }

  this.options = options || {}

  this.partials = {}
  this.state = state || {}
  this.filters = Object.create(this.options.filters || null)
  this.rootKey = this.options.rootKey

  this.rootExpression = new Expression('this', [], this.state)

  this.expressions = {}
  this.handlers = {}
  this.handlerList = []

  this.expressions['this'] = this.rootExpression
  this.rootExpression.removable = false

  if(this.rootKey) {
    this.expressions[this.rootKey] = this.rootExpression
  }

  this.updating = false
}

DirtyBit.prototype.removeListener = remove
DirtyBit.prototype.addFilter = addFilter
DirtyBit.prototype.update = update
DirtyBit.prototype.report = report
DirtyBit.prototype.types = types
DirtyBit.prototype.split = split
DirtyBit.prototype.parse = parse
DirtyBit.prototype.watch = watch
DirtyBit.prototype.hash = hash
DirtyBit.prototype.trim = trim
DirtyBit.prototype.on = on

DirtyBit.parsed = {}

function update(state) {
  this.state = state
  this.updating = true
  this.rootExpression.change(state)
  this.updating = false
  this.report()
}

function report() {
  var expression
  var lookup

  for(var i = 0, l = this.handlerList.length; i < l; ++i) {
    lookup = this.handlerList[i]
    expression = this.expressions[lookup]

    if(!expression.changed) {
      continue
    }

    for(var j = 0, l2 = this.handlers[lookup].length; j < l2; ++j) {
      this.handlers[lookup][j](expression.value)
    }

    expression.changed = false
  }
}

function addFilter(name, filter) {
  this.filters[name] = filter
}

function trim(str) {
  return str.replace(/^\s+|\s+$/g, '')
}

function on(_lookup, handler) {
  var lookup = this.trim(_lookup)

  if(this.handlers[lookup]) {
    this.handlers[lookup].push(handler)

    return handler(this.expressions[lookup].value)
  }

  this.updating = true
  this.watch(lookup)
  this.handlerList.push(lookup)
  this.handlers[lookup] = [handler]
  this.updating = false
  handler(this.expressions[lookup].value)
}

},{"./expression":30,"./hash":31,"./parse":33,"./remove":34,"./split":35,"./types":40,"./watch":47}],33:[function(require,module,exports){
module.exports = parse

function parse(lookup) {
  var val

  for(var i = 0, l = this.types.order.length; i < l; ++i) {
    val = this.types.types[this.types.order[i]].parse.call(this, lookup)

    if(val) {
      break
    }
  }

  val.type = this.types.order[i]
  val.lookup = lookup

  return val
}

},{}],34:[function(require,module,exports){
module.exports = remove

function remove(_lookup, handler) {
  var lookup = this.trim(_lookup)
  var handlers = this.handlers[lookup]

  if(!handlers) {
    return
  }

  var index = handlers.indexOf(handler)

  if(index < 0) {
    return
  }

  handlers.splice(index, 1)

  if(this.handlers[lookup].length) {
    return
  }

  delete this.handlers[lookup]
  this.handlerList.splice(this.handlerList.indexOf(lookup), 1)
  removeExpression(this, this.expressions[lookup])
}

function removeExpression(self, expression) {
  if(expression.dependents.length || !expression.removable) {
    return
  }

  delete self.expressions[expression.parsed.lookup]

  for(var i = 0, l = expression.deps.length, dep; i < l; ++i) {
    dep = expression.deps[i]
    dep.dependents.splice(dep.dependents.indexOf(expression), 1)
    removeExpression(self, dep)
  }
}

},{}],35:[function(require,module,exports){
var default_pairs = [
    ['(', ')']
  , ['[', ']']
  , ['?', ':']
  , ['"', '"', true]
  , ["'", "'", true]
]

module.exports = split
module.exports.pairs = default_pairs

function split(parts, key, all, _pairs) {
  var pairs = _pairs || default_pairs
    , inString = false
    , layers = []

  for(var i = 0, l = parts.length; i < l; ++i) {
    if(!~parts.indexOf(key)) {
      i = l

      break
    }

    if(!layers.length) {
      for(var j = 0, l2 = key.length; j < l2; ++j) {
        if(parts[i + j] !== key[j]) {
          break
        }
      }

      if(j === key.length) {
        break
      }
    }

    if(layers.length && layers[layers.length - 1] === parts[i]) {
      inString = false
      layers.pop()

      continue
    }

    if(inString) {
      continue
    }

    for(var j = 0, l2 = pairs.length; j < l2; ++j) {
      if(parts[i] === pairs[j][0]) {
        if(pairs[j][2]) {
          inString = true
        }

        layers.push(pairs[j][1])

        break
      }
    }
  }

  if(layers.length) {
    console.error(
        'Unmatched pair in ' + parts + '. expecting: ' + layers.pop()
    )
  }

  if(i === parts.length) {
    return [parts]
  }

  var right = parts.slice(i + key.length)
    , left = parts.slice(0, i)

  if(!all) {
    return [left, right]
  }

  return [left].concat(split(right, key, all, pairs))
}

},{}],36:[function(require,module,exports){
module.exports = create
module.exports.parse = parse

var tests = []
var ops = {}

add(['|\\|'])
add(['&&'])
add(['|'])
add(['^'])
add(['&'])
add(['===', '!==', '==', '!='])
add(['>=', '<=', '>', '<', ' in ', ' instanceof '])
// add(['<<', '>>', '>>>']) //conflics with < and >
add(['+', '-'])
add(['*', '/', '%'])

ops['in'] = updateIn
ops['instanceof'] = updateInstanceof

function add(list) {
  tests.push(new RegExp('^(.+?)(\\' + list.join('|\\') + ')(.+)$'))
}

function parse(lookup) {
  var parts

  for(var i = 0, l = tests.length; i < l; ++i) {
    parts = lookup.match(tests[i])

    if(parts) {
      break
    }
  }

  if(!parts) {
    return false
  }

  return {deps: [parts[1], parts[3]], options: parts[2]}
}

function create(change, op) {
  if(!ops[op]) {
    ops[op] = createOp(op)
  }

  return ops[op].bind(null, change)
}

function createOp(op) {
  return Function('change, left, right', 'change(left ' + op + ' right)')
}

function updateIn(left, right) {
  return typeof right !== 'undefined' && left in right
}

function updateInstanceof(left, right) {
  return typeof right === 'function' && left instanceof right
}

},{}],37:[function(require,module,exports){
var has_bracket = /^.*\S\[.+\]$/

module.exports = brackets
module.exports.parse = parse

function parse(lookup) {
  if(!has_bracket.test(lookup)) {
    return false
  }

  var pairs = this.split.pairs.map(function(pair) {
    return [pair[1], pair[0], pair[2]]
  })

  return {
      deps: this.split(reverse(lookup.slice(0, -1)), '[', false, pairs)
        .map(reverse)
  }
}

function reverse(str) {
  return str.split('').reverse().join('')
}

function brackets(change) {
  return function(inner, root) {
    if(root === null || root === undefined) {
      return change()
    }

    change(root[inner])
  }
}

},{}],38:[function(require,module,exports){
var valid_path = /^(.*)\.([^.\s]+)$/

module.exports = create
module.exports.parse = parse

function parse(lookup) {
  var parts = lookup.match(valid_path)

  return parts ?
    {deps: [parts[1]], options: parts[2]} :
    {deps: ['this'], options: lookup}
}

function create(change, key) {
  return function(obj) {
    if(obj === null || obj === undefined) {
      return change()
    }

    change(obj[key])
  }
}

},{}],39:[function(require,module,exports){
var filter_regexp = /^([^\s(]+)\((.*)\)$/

module.exports = create
module.exports.parse = parse

function parse(lookup) {
  var parts = lookup.match(filter_regexp)

  if(!parts) {
    return false
  }

  return {deps: this.split(parts[2], ',', true), options: parts[1]}
}

function create(change, name) {
  return this.filters[name](change) || function() {
    console.error('could not find filter: ' + name)
  }
}

},{}],40:[function(require,module,exports){
var brackets = require('./brackets')
var dot_path = require('./dot-path')
var filters = require('./filters')
var partial = require('./partial')
var ternary = require('./ternary')
var parens = require('./parens')
var values = require('./values')
var binary = require('./binary')
var unary = require('./unary')
var list = require('./list')

module.exports.order = [
    'values'
  , 'filters'
  , 'partial'
  , 'parens'
  , 'ternary'
  , 'binary'
  , 'unary'
  , 'brackets'
  , 'list'
  , 'dot_path'
]

module.exports.types = {
    values: values
  , filters: filters
  , partial: partial
  , parens: parens
  , ternary: ternary
  , binary: binary
  , unary: unary
  , brackets: brackets
  , list: list
  , dot_path: dot_path
}

},{"./binary":36,"./brackets":37,"./dot-path":38,"./filters":39,"./list":41,"./parens":42,"./partial":43,"./ternary":44,"./unary":45,"./values":46}],41:[function(require,module,exports){
var is_list = /^\[.+\]$/

module.exports = list
module.exports.parse = parse

function parse(lookup) {
  if(!is_list.test(lookup)) {
    return false
  }

  return {deps: this.split(lookup.slice(1, -1), ',', true)}
}

function list(change) {
  return function() {
    change([].slice.call(arguments))
  }
}

},{}],42:[function(require,module,exports){
var parens_regexp = /(^|[^0-9a-zA-Z_$])\((.*)$/

module.exports.parse = parse

function parse(lookup) {
  var parts = lookup.match(parens_regexp)

  if(!parts) {
    return false
  }

  var body = this.split(parts[2], ')')[0]
  var key = '{{paren_' + this.hash(body) + '}}'
  var partials = {}

  partials[key] = body

  var patched = lookup.slice(0, lookup.lastIndexOf([parts[2]]) - 1) +
    key + parts[2].slice(body.length + 1)

  return {proxy: patched, partials: partials}
}

},{}],43:[function(require,module,exports){
var regexp = /^\{\{[#_\w]+\}\}$/

module.exports.parse = parse

function parse(lookup) {
  return regexp.test(lookup) ? {proxy: this.partials[lookup]} : false
}

},{}],44:[function(require,module,exports){
var ternary_regexp = /^\s*(.+?)\s*\?(.*)\s*$/

module.exports = create
module.exports.parse = parse

function parse(lookup) {
  var parts = lookup.match(ternary_regexp)

  if(!parts) {
    return false
  }

  var rest = this.split(parts[2], ':')

  if(rest.length !== 2) {
    console.error('Unmatched ternary in: ' + lookup)
  }

  return {deps: [parts[1], rest[0], rest[1]]}
}

function create(change) {
  return function(ok, left, right) {
    change(ok ? left : right)
  }
}

},{}],45:[function(require,module,exports){
module.exports = create
module.exports.parse = parse

var test = new RegExp('^(\\' + ['!', '+', '-', '~'].join('|\\') + ')(.+)$')

var ops = {}

function parse(lookup) {
  var parts = lookup.match(test)

  if(!parts) {
    return false
  }

  return {deps: [parts[2]], options: parts[1]}
}

function create(change, op) {
  if(!ops[op]) {
    ops[op] = create_op(op)
  }

  return ops[op].bind(null, change)
}

function create_op(op) {
  return Function('change, val', 'change(' + op + 'val)')
}

},{}],46:[function(require,module,exports){
var string_regexp = /^(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")$/
  , number_regexp = /^(\d*(?:\.\d+)?)$/

module.exports.parse = parse

var vals = {
    'true': true
  , 'false': false
  , 'null': null
  , 'undefined': undefined
}

function parse(lookup) {
  if(vals.hasOwnProperty(lookup)) {
    return {value: vals[lookup]}
  }

  if(number_regexp.test(lookup)) {
    return {value: +lookup}
  }

  if(string_regexp.test(lookup)) {
    return {value: lookup.slice(1, -1)}
  }
}

},{}],47:[function(require,module,exports){
var Expression = require('./expression')

module.exports = watch

var seen = {}

function watch(lookup) {
  var self = this

  var parsed = seen[lookup] || (seen[lookup] = self.parse(lookup))
  var partials = parsed.partials && Object.keys(parsed.partials)

  var handler = createHandler.call(self, parsed, change)

  if(partials) {
    for(var i = 0, l = partials.length; i < l; ++i) {
      self.partials[partials[i]] = parsed.partials[partials[i]]
      getDep.call(self, self.partials[partials[i]])
    }
  }

  var expression = createExpression.call(self, parsed, handler)

  self.expressions[lookup] = expression

  if(expression.handler) {
    expression.update()
  }

  return expression

  function change(val) {
    if(self.updating) {
      return expression.change(val)
    }

    self.updating = true
    expression.change(val)
    self.updating = false
    self.report()
  }
}

function createHandler(parsed, change) {
  var type = this.types.types[parsed.type]

  if(typeof type === 'function') {
    return type.call(this, change, parsed.options)
  }

  return null
}

function createExpression(parsed, handler) {
  var deps = parsed.deps ? parsed.deps.map(getDep.bind(this)) : []
  var proxy = parsed.proxy && getDep.call(this, parsed.proxy)
  var expression

  if(proxy) {
    return expression = new Expression(parsed, [proxy], proxy.value, echo)
  }

  return new Expression(parsed, deps, parsed.value, handler)

  function echo(val) {
    expression.change(val)
  }
}

function getDep(_lookup) {
  var lookup = this.trim(_lookup)

  return this.expressions[lookup] || this.watch(lookup)
}

},{"./expression":30}],48:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	"use strict";
	if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval) {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	"use strict";
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === "boolean") {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if (typeof target !== "object" && typeof target !== "function" || target == undefined) {
			target = {};
	}

	for (; i < length; ++i) {
		// Only deal with non-null/undefined values
		if ((options = arguments[i]) != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvYWx0ci1leHRlbmQuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvYWx0ci5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9hdHRyaWJ1dGVzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL2Jyb3dzZXIuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvZGVjb3JhdG9ycy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9kZXN0cm95LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL2VsZW1lbnQtbm9kZS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9nZXQtZWxlbWVudC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9tZXJnZS1ob29rcy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9yYWYuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvcmVtb3ZlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3JlbmRlci5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9ydW4taG9va3MuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvc2V0LWNoaWxkcmVuLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvY2hpbGRyZW4uanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvcGxhY2Vob2xkZXIuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9yYXcuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy90ZXh0LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3Mvd2l0aC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi90ZW1wbGF0ZS1zdHJpbmcuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGV4dC1ub2RlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RvLXN0cmluZy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9iYXRjaC1xdWV1ZS9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9leHByZXNzaW9uLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9oYXNoLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvcGFyc2UuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3JlbW92ZS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvc3BsaXQuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3R5cGVzL2JpbmFyeS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvYnJhY2tldHMuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3R5cGVzL2RvdC1wYXRoLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy9maWx0ZXJzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvbGlzdC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvcGFyZW5zLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy9wYXJ0aWFsLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy90ZXJuYXJ5LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy91bmFyeS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvdmFsdWVzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi93YXRjaC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9leHRlbmQvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyRXh0ZW5kXG5cbmZ1bmN0aW9uIGFsdHJFeHRlbmQoYmFzZSwgb3B0aW9ucykge1xuICB2YXIgYmFzZU9wdGlvbnMgPSBleHRlbmQodHJ1ZSwgYmFzZSwgb3B0aW9ucylcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgZXh0ZW5zaW9uLnJlbmRlciA9IGFsdHIucmVuZGVyLmJpbmQoYWx0ciwgYmFzZU9wdGlvbnMpXG4gIGV4dGVuc2lvbi5leHRlbmQgPSBhbHRyLmV4dGVuZC5iaW5kKGFsdHIpXG4gIGV4dGVuc2lvbi5hZGRUYWcgPSBhbHRyLmFkZFRhZy5iaW5kKGFsdHIpXG4gIGV4dGVuc2lvbi5pbmNsdWRlID0gYWx0ci5pbmNsdWRlLmJpbmQoYWx0cilcbiAgZXh0ZW5zaW9uLmFkZEZpbHRlciA9IGFsdHIuYWRkRmlsdGVyLmJpbmQoYWx0cilcbiAgZXh0ZW5zaW9uLmFkZERlY29yYXRvciA9IGFsdHIuYWRkRGVjb3JhdG9yLmJpbmQoYWx0cilcblxuICByZXR1cm4gZXh0ZW5zaW9uXG5cbiAgZnVuY3Rpb24gZXh0ZW5zaW9uKHJvb3QsIHN0YXRlLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBhbHRyKHJvb3QsIHN0YXRlLCBleHRlbmQoXG4gICAgICAgIHRydWVcbiAgICAgICwgT2JqZWN0LmNyZWF0ZShiYXNlT3B0aW9ucylcbiAgICAgICwgb3B0aW9ucyB8fCB7fVxuICAgICkpXG4gIH1cbn0iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcbnZhciBiYXRjaCA9IHJlcXVpcmUoJ2JhdGNoLXF1ZXVlJylcbnZhciBkaXJ0eWJpdCA9IHJlcXVpcmUoJ2RpcnR5Yml0JylcbnZhciBleHRlbmQgPSByZXF1aXJlKCdleHRlbmQnKVxuXG52YXIgdGVtcGxhdGVTdHJpbmcgPSByZXF1aXJlKCcuL3RlbXBsYXRlLXN0cmluZycpXG52YXIgZWxlbWVudE5vZGUgPSByZXF1aXJlKCcuL2VsZW1lbnQtbm9kZScpXG52YXIgbWVyZ2VIb29rcyA9IHJlcXVpcmUoJy4vbWVyZ2UtaG9va3MnKVxudmFyIGFsdHJFeHRlbmQgPSByZXF1aXJlKCcuL2FsdHItZXh0ZW5kJylcbnZhciB0ZXh0Tm9kZSA9IHJlcXVpcmUoJy4vdGV4dC1ub2RlJylcbnZhciB0b1N0cmluZyA9IHJlcXVpcmUoJy4vdG8tc3RyaW5nJylcbnZhciBydW5Ib29rcyA9IHJlcXVpcmUoJy4vcnVuLWhvb2tzJylcbnZhciBnZXRFbCA9IHJlcXVpcmUoJy4vZ2V0LWVsZW1lbnQnKVxudmFyIGRlc3Ryb3kgPSByZXF1aXJlKCcuL2Rlc3Ryb3knKVxudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJylcbnZhciByZW1vdmUgPSByZXF1aXJlKCcuL3JlbW92ZScpXG52YXIgcmFmID0gcmVxdWlyZSgnLi9yYWYnKVxuXG4vLyBkeW5hbWljIHJlcXVpcmUgc28gaXQgZG9lcyBub3QgbWFrZSBpdCBpbnRvIHRoZSBicm93c2VyaWZ5IGJ1bmRsZVxudmFyIGRvbU1vZHVsZSA9ICdtaWNyby1kb20nXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuXG5hbHRyLmZpbHRlcnMgPSB7fVxuYWx0ci5pbmNsdWRlcyA9IHt9XG5hbHRyLmRlY29yYXRvcnMgPSB7fVxuXG5hbHRyLnJlbmRlciA9IHJlbmRlclxuYWx0ci5hZGRUYWcgPSBhZGRUYWdcbmFsdHIuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIuZXh0ZW5kID0gYWx0ckV4dGVuZFxuYWx0ci5hZGRGaWx0ZXIgPSBhZGRGaWx0ZXJcbmFsdHIuYWRkRGVjb3JhdG9yID0gYWRkRGVjb3JhdG9yXG5cbmZ1bmN0aW9uIGFsdHIocm9vdCwgZGF0YSwgb3B0aW9ucykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBvcHRpb25zKVxuICB9XG5cbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgdGhpcy5maWx0ZXJzID0gZXh0ZW5kKFxuICAgICAgZmFsc2VcbiAgICAsIE9iamVjdC5jcmVhdGUoYWx0ci5maWx0ZXJzKVxuICAgICwgb3B0aW9ucy5maWx0ZXJzIHx8IHt9XG4gIClcblxuICB0aGlzLmRlY29yYXRvcnMgPSBleHRlbmQoXG4gICAgICBmYWxzZVxuICAgICwgT2JqZWN0LmNyZWF0ZShhbHRyLmRlY29yYXRvcnMpXG4gICAgLCBvcHRpb25zLmRlY29yYXRvcnMgfHwge31cbiAgKVxuXG4gIHRoaXMuaW5jbHVkZXMgPSBleHRlbmQoXG4gICAgICBmYWxzZVxuICAgICwgT2JqZWN0LmNyZWF0ZShhbHRyLmluY2x1ZGVzKVxuICAgICwgb3B0aW9ucy5pbmNsdWRlcyB8fCB7fVxuICApXG5cbiAgdGhpcy5yb290ID0gcm9vdFxuICB0aGlzLnN5bmMgPSAhIW9wdGlvbnMuc3luY1xuICB0aGlzLnRhZ1JlZ0V4cCA9IG1ha2VUYWdSZWdFeHAob3B0aW9ucy5kZWxpbWl0ZXJzKVxuICB0aGlzLmRvY3VtZW50ID0gb3B0aW9ucy5kb2MgfHwgZ2xvYmFsLmRvY3VtZW50IHx8IHJlcXVpcmUoZG9tTW9kdWxlKS5kb2N1bWVudFxuICB0aGlzLmxvb2t1cHMgPSBkaXJ0eWJpdChkYXRhLCB7ZmlsdGVyczogdGhpcy5maWx0ZXJzfSlcblxuICB0aGlzLmJhdGNoID0gYmF0Y2goKGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLnN5bmMpIHtcbiAgICAgIHJhZih0aGlzLnJ1bkJhdGNoLmJpbmQodGhpcykpXG4gICAgfVxuICB9KS5iaW5kKHRoaXMpKVxuXG4gIGlmKGdsb2JhbC5CdWZmZXIgJiYgcm9vdCBpbnN0YW5jZW9mIGdsb2JhbC5CdWZmZXIpIHtcbiAgICByb290ID0gcm9vdC50b1N0cmluZygpXG4gIH1cblxuICBpZih0eXBlb2Ygcm9vdCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgdGVtcCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gcm9vdFxuICAgIHRoaXMucm9vdCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG5cbiAgICB3aGlsZSh0ZW1wLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMucm9vdC5hcHBlbmRDaGlsZCh0ZW1wLmZpcnN0Q2hpbGQpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5jaGlsZHJlbiA9IHRoaXMuaW5pdE5vZGVzKHRoaXMucm9vdE5vZGVzKCksIHRoaXMubG9va3VwcylcbiAgdGhpcy5ydW5Ib29rcyh0aGlzLmNoaWxkcmVuLmhvb2tzLCAnaW5zZXJ0JywgbnVsbClcbiAgdGhpcy5ydW5CYXRjaCgpXG59XG5cbmFsdHIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFRS5wcm90b3R5cGUpXG5hbHRyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGFsdHJcblxuYWx0ci5wcm90b3R5cGUudGVtcGxhdGVTdHJpbmcgPSB0ZW1wbGF0ZVN0cmluZ1xuYWx0ci5wcm90b3R5cGUuYWRkRGVjb3JhdG9yID0gYWRkRGVjb3JhdG9yXG5hbHRyLnByb3RvdHlwZS5tZXJnZUhvb2tzID0gbWVyZ2VIb29rc1xuYWx0ci5wcm90b3R5cGUuaW5pdE5vZGVzID0gaW5pdE5vZGVzXG5hbHRyLnByb3RvdHlwZS5yb290Tm9kZXMgPSByb290Tm9kZXNcbmFsdHIucHJvdG90eXBlLmFkZEZpbHRlciA9IGFkZEZpbHRlclxuYWx0ci5wcm90b3R5cGUucnVuQmF0Y2ggPSBydW5CYXRjaFxuYWx0ci5wcm90b3R5cGUudG9TdHJpbmcgPSB0b1N0cmluZ1xuYWx0ci5wcm90b3R5cGUucnVuSG9va3MgPSBydW5Ib29rc1xuYWx0ci5wcm90b3R5cGUuZ2V0RWxlbWVudCA9IGdldEVsXG5hbHRyLnByb3RvdHlwZS5pbmNsdWRlID0gaW5jbHVkZVxuYWx0ci5wcm90b3R5cGUuZGVzdHJveSA9IGRlc3Ryb3lcbmFsdHIucHJvdG90eXBlLnJlbW92ZSA9IHJlbW92ZVxuYWx0ci5wcm90b3R5cGUuaW50byA9IGFwcGVuZFRvXG5hbHRyLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcbmFsdHIucHJvdG90eXBlLnRhZ0xpc3QgPSBbXVxuYWx0ci5wcm90b3R5cGUudGFncyA9IHt9XG5cbnZhciBub2RlX2hhbmRsZXJzID0ge31cblxubm9kZV9oYW5kbGVyc1sxXSA9IGVsZW1lbnROb2RlXG5ub2RlX2hhbmRsZXJzWzNdID0gdGV4dE5vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEsIHN5bmMpIHtcbiAgdGhpcy5zdGF0ZSA9IGRhdGFcbiAgdGhpcy5sb29rdXBzLnVwZGF0ZShkYXRhKVxuXG4gIGlmKHN5bmMgfHwgdGhpcy5zeW5jKSB7XG4gICAgdGhpcy5ydW5CYXRjaCgpXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdE5vZGVzKF9ub2RlcywgX2xvb2t1cHMsIHN0YXRlKSB7XG4gIHZhciBhbHRyID0gdGhpc1xuICB2YXIgbG9va3VwcyA9IF9sb29rdXBzIHx8IGRpcnR5Yml0KHN0YXRlLCB7ZmlsdGVyczogdGhpcy5maWx0ZXJzfSlcbiAgdmFyIG5vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoX25vZGVzKVxuICB2YXIgaG9va3MgPSBub2Rlcy5yZWR1Y2Uoam9pbiwgW10pLmZpbHRlcihCb29sZWFuKVxuXG4gIHJldHVybiB7aG9va3M6IGhvb2tzLCBsb29rdXBzOiBsb29rdXBzLCBub2Rlczogbm9kZXN9XG5cbiAgZnVuY3Rpb24gam9pbihsaXN0LCBub2RlKSB7XG4gICAgdmFyIGhvb2tzID0gaW5pdE5vZGUuY2FsbChhbHRyLCBsb29rdXBzLCBub2RlKVxuXG4gICAgcmV0dXJuIGhvb2tzID8gbGlzdC5jb25jYXQoaG9va3MpIDogbGlzdFxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXROb2RlKGxvb2t1cHMsIGVsKSB7XG4gIHJldHVybiBub2RlX2hhbmRsZXJzW2VsLm5vZGVUeXBlXSA/XG4gICAgbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV0uY2FsbCh0aGlzLCBlbCwgbG9va3VwcykgOlxuICAgIGVsLmNoaWxkTm9kZXMgJiYgZWwuY2hpbGROb2Rlcy5sZW5ndGggP1xuICAgIHRoaXMuaW5pdE5vZGVzKGxvb2t1cHMsIGVsLmNoaWxkTm9kZXMpIDpcbiAgICBudWxsXG59XG5cbmZ1bmN0aW9uIHJvb3ROb2RlcygpIHtcbiAgcmV0dXJuIHRoaXMucm9vdC5ub2RlVHlwZSA9PT0gdGhpcy5kb2N1bWVudC5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFID9cbiAgICBbXS5zbGljZS5jYWxsKHRoaXMucm9vdC5jaGlsZE5vZGVzKSA6XG4gICAgW3RoaXMucm9vdF1cbn1cblxuZnVuY3Rpb24gYWRkRmlsdGVyKG5hbWUsIGZpbHRlcikge1xuICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmaWx0ZXJcbn1cblxuZnVuY3Rpb24gYWRkVGFnKGF0dHIsIHRhZykge1xuICB0aGlzLnByb3RvdHlwZS50YWdzW2F0dHJdID0gdGFnXG4gIHRoaXMucHJvdG90eXBlLnRhZ0xpc3QucHVzaCh7XG4gICAgICBhdHRyOiBhdHRyXG4gICAgLCBjb25zdHJ1Y3RvcjogdGFnXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRvKG5vZGUpIHtcbiAgdmFyIHJvb3ROb2RlcyA9IHRoaXMucm9vdE5vZGVzKClcblxuICBmb3IodmFyIGkgPSAwLCBsID0gcm9vdE5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQoZ2V0RWwocm9vdE5vZGVzW2ldKSlcbiAgfVxufVxuXG5mdW5jdGlvbiBpbmNsdWRlKG5hbWUsIHRlbXBsYXRlKSB7XG4gIHJldHVybiB0aGlzLmluY2x1ZGVzW25hbWVdID0gdGVtcGxhdGVcbn1cblxuZnVuY3Rpb24gYWRkRmlsdGVyKG5hbWUsIGZuKSB7XG4gIHJldHVybiB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBhZGREZWNvcmF0b3IobmFtZSwgZm4pIHtcbiAgcmV0dXJuIHRoaXMuZGVjb3JhdG9yc1tuYW1lXSA9IGZuXG59XG5cbmZ1bmN0aW9uIHJ1bkJhdGNoKCkge1xuICB0aGlzLmJhdGNoLnJ1bigpICYmIHRoaXMuZW1pdCgndXBkYXRlJywgdGhpcy5zdGF0ZSlcbn1cblxuZnVuY3Rpb24gbWFrZVRhZ1JlZ0V4cChfZGVsaW1pdGVycykge1xuICB2YXIgZGVsaW1pdGVycyA9IF9kZWxpbWl0ZXJzIHx8IFsne3snLCAnfX0nXVxuXG4gIHJldHVybiBuZXcgUmVnRXhwKGRlbGltaXRlcnNbMF0gKyAnXFxcXHMqKC4qPylcXFxccyonICsgZGVsaW1pdGVyc1sxXSlcbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cy5yYXcgPSByYXdBdHRyaWJ1dGVcbm1vZHVsZS5leHBvcnRzLmFsdHIgPSBhbHRyQXR0cmlidXRlXG5tb2R1bGUuZXhwb3J0cy5wcm9wID0gYWx0clByb3BlcnR5XG5cbmZ1bmN0aW9uIHJhd0F0dHJpYnV0ZShlbCwgYXR0ciwgbG9va3Vwcykge1xuICB0aGlzLnRlbXBsYXRlU3RyaW5nKFxuICAgICAgYXR0ci52YWx1ZVxuICAgICwgdGhpcy5iYXRjaC5hZGQoZWwuc2V0QXR0cmlidXRlLmJpbmQoZWwsIGF0dHIubmFtZSkpXG4gICAgLCBsb29rdXBzXG4gIClcbn1cblxuZnVuY3Rpb24gYWx0ckF0dHJpYnV0ZShlbCwgYXR0ciwgbG9va3Vwcykge1xuICB2YXIgbmFtZSA9IGF0dHIubmFtZS5zbGljZSgnYWx0ci1hdHRyLScubGVuZ3RoKVxuXG4gIGxvb2t1cHMub24oYXR0ci52YWx1ZSwgdGhpcy5iYXRjaC5hZGQodXBkYXRlKSlcbiAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgaWYoIXZhbCAmJiB2YWwgIT09ICcnICYmIHZhbCAhPT0gMCkge1xuICAgICAgcmV0dXJuIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKVxuICAgIH1cblxuICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCB2YWwpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWx0clByb3BlcnR5KGVsLCBhdHRyLCBsb29rdXBzKSB7XG4gIHZhciBuYW1lID0gYXR0ci5uYW1lLnNsaWNlKCdhbHRyLXByb3AtJy5sZW5ndGgpXG5cbiAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSlcbiAgbG9va3Vwcy5vbihhdHRyLnZhbHVlLCB0aGlzLmJhdGNoLmFkZCh1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbFtuYW1lXSA9IHZhbFxuICB9XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5hbHRyID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSBkZWNvcmF0b3JzXG5cbmZ1bmN0aW9uIGRlY29yYXRvcnMoZWwsIGF0dHJzLCBsb29rdXBzKSB7XG4gIHZhciBhbHRyID0gdGhpc1xuICB2YXIgaG9va3MgPSBbXVxuXG4gIHJldHVybiBhdHRycy5tYXAoY3JlYXRlRGVjb3JhdG9yKVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZURlY29yYXRvcihhdHRyKSB7XG4gICAgdmFyIGRlY29yYXRvciA9IGFsdHIuZGVjb3JhdG9yc1thdHRyLm5hbWVdLmNhbGwoYWx0ciwgZWwpXG4gICAgdmFyIGV4cHJlc3Npb24gPSAnWycgKyBhdHRyLnZhbHVlICsgJ10nXG5cbiAgICBpZighZGVjb3JhdG9yKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgaG9va3MgPSB7aW5zZXJ0OiBkZWNvcmF0b3IuaW5zZXJ0LCByZW1vdmU6IGRlY29yYXRvci5yZW1vdmV9XG5cbiAgICBpZihkZWNvcmF0b3IudXBkYXRlKSB7XG4gICAgICBsb29rdXBzLm9uKGV4cHJlc3Npb24sIHVwZGF0ZSlcbiAgICB9XG5cbiAgICBob29rcy5kZXN0cm95ID0gZGVzdHJveVxuXG4gICAgcmV0dXJuIGhvb2tzXG5cbiAgICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgbG9va3Vwcy5yZW1vdmVMaXN0ZW5lcihleHByZXNzaW9uLCB1cGRhdGUpXG5cbiAgICAgIGlmKGRlY29yYXRvci5kZXN0cm95KSB7XG4gICAgICAgIGRlY29yYXRvci5kZXN0cm95KClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGUoYXJncykge1xuICAgICAgZGVjb3JhdG9yLnVwZGF0ZS5hcHBseShudWxsLCBhcmdzKVxuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBkZXN0cm95XG5cbmZ1bmN0aW9uIGRlc3Ryb3koY2hpbGRyZW4sIGVsLCBkb25lKSB7XG4gIHZhciBhbHRyID0gdGhpc1xuXG4gIGFsdHIucmVtb3ZlKGNoaWxkcmVuLCBlbCwgZnVuY3Rpb24oZWwpIHtcbiAgICBhbHRyLnJ1bkhvb2tzKGNoaWxkcmVuLCAnZGVzdHJveScsIGVsKVxuICAgIGRvbmUoKVxuICB9KVxufVxuIiwidmFyIGNyZWF0ZURlY29yYXRvcnMgPSByZXF1aXJlKCcuL2RlY29yYXRvcnMnKVxuICAsIGNyZWF0ZUF0dHIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnROb2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROb2RlKGVsLCBsb29rdXBzKSB7XG4gIHZhciBkZWNvcmF0b3JzID0gW11cbiAgdmFyIGFsdHIgPSB0aGlzXG4gIHZhciBhdHRyXG5cbiAgdmFyIGF0dHJzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwuYXR0cmlidXRlcylcbiAgdmFyIGRlY29yYXRvcnMgPSBbXVxuICB2YXIgYWx0cl90YWdzID0ge31cbiAgdmFyIHRhZ3MgPSB7fVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihhbHRyLnRhZ3NbYXR0cnNbaV0ubmFtZV0pIHtcbiAgICAgIGFsdHJfdGFnc1thdHRyc1tpXS5uYW1lXSA9IGF0dHJzW2ldLnZhbHVlXG4gICAgfSBlbHNlIGlmKGFsdHIuZGVjb3JhdG9yc1thdHRyc1tpXS5uYW1lXSkge1xuICAgICAgZGVjb3JhdG9ycy5wdXNoKGF0dHJzW2ldKVxuICAgIH0gZWxzZSBpZighYXR0cnNbaV0ubmFtZS5sYXN0SW5kZXhPZignYWx0ci1hdHRyLScsIDApKSB7XG4gICAgICBjcmVhdGVBdHRyLmFsdHIuY2FsbCh0aGlzLCBlbCwgYXR0cnNbaV0sIGxvb2t1cHMpXG4gICAgfSBlbHNlIGlmKCFhdHRyc1tpXS5uYW1lLmxhc3RJbmRleE9mKCdhbHRyLXByb3AtJywgMCkpIHtcbiAgICAgIGNyZWF0ZUF0dHIucHJvcC5jYWxsKHRoaXMsIGVsLCBhdHRyc1tpXSwgbG9va3VwcylcbiAgICB9IGVsc2Uge1xuICAgICAgY3JlYXRlQXR0ci5yYXcuY2FsbCh0aGlzLCBlbCwgYXR0cnNbaV0sIGxvb2t1cHMpXG4gICAgfVxuICB9XG5cbiAgdmFyIGhvb2tzID0gY3JlYXRlRGVjb3JhdG9ycy5jYWxsKGFsdHIsIGVsLCBkZWNvcmF0b3JzLCBsb29rdXBzKVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhbHRyLnRhZ0xpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYXR0ciA9IGFsdHJfdGFnc1thbHRyLnRhZ0xpc3RbaV0uYXR0cl0pIHtcbiAgICAgIHJldHVybiBob29rcy5jb25jYXQoW1xuICAgICAgICAgIGFsdHIudGFnTGlzdFtpXS5jb25zdHJ1Y3Rvci5jYWxsKGFsdHIsIGVsLCBhdHRyLCBsb29rdXBzLCBob29rcykgfHwge31cbiAgICAgIF0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhvb2tzLmNvbmNhdChhbHRyLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzLCBsb29rdXBzKS5ob29rcylcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZ2V0XG5cbmZ1bmN0aW9uIGdldChfZWwpIHtcbiAgdmFyIGVsID0gX2VsXG5cbiAgd2hpbGUoZWwgJiYgZWwuX2FsdHJQbGFjZWhvbGRlcikge1xuICAgIGVsID0gZWwuX2FsdHJQbGFjZWhvbGRlclxuXG4gICAgaWYoZWwgPT09IF9lbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdwbGFjZWhvbGRlciBjaXJjdWxhciByZWZmZXJlbmNlJylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZWxcbn1cbiIsInZhciBwbGFjZWhvbGRlciA9IHJlcXVpcmUoJy4vdGFncy9wbGFjZWhvbGRlcicpXG4gICwgY2hpbGRyZW5UYWcgPSByZXF1aXJlKCcuL3RhZ3MvY2hpbGRyZW4nKVxuICAsIGluY2x1ZGVUYWcgPSByZXF1aXJlKCcuL3RhZ3MvaW5jbHVkZScpXG4gICwgdGV4dFRhZyA9IHJlcXVpcmUoJy4vdGFncy90ZXh0JylcbiAgLCBodG1sVGFnID0gcmVxdWlyZSgnLi90YWdzL2h0bWwnKVxuICAsIHdpdGhUYWcgPSByZXF1aXJlKCcuL3RhZ3Mvd2l0aCcpXG4gICwgZm9yVGFnID0gcmVxdWlyZSgnLi90YWdzL2ZvcicpXG4gICwgcmF3VGFnID0gcmVxdWlyZSgnLi90YWdzL3JhdycpXG4gICwgaWZUYWcgPSByZXF1aXJlKCcuL3RhZ3MvaWYnKVxuICAsIGFsdHIgPSByZXF1aXJlKCcuL2FsdHInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcblxuYWx0ci5hZGRUYWcoJ2FsdHItY2hpbGRyZW4nLCBjaGlsZHJlblRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLXJlcGxhY2UnLCBwbGFjZWhvbGRlcilcbmFsdHIuYWRkVGFnKCdhbHRyLWluY2x1ZGUnLCBpbmNsdWRlVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItdGV4dCcsIHRleHRUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci1odG1sJywgaHRtbFRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLXdpdGgnLCB3aXRoVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItZm9yJywgZm9yVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItcmF3JywgcmF3VGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItaWYnLCBpZlRhZylcbiIsIm1vZHVsZS5leHBvcnRzID0gbWVyZ2VcblxuZnVuY3Rpb24gbWVyZ2UoY2hpbGRyZW4pIHtcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgcmV0dXJuIHtcbiAgICAgIGluc2VydDogZWFjaC5iaW5kKG51bGwsICdpbnNlcnQnKVxuICAgICwgZGVzdHJveTogZWFjaC5iaW5kKG51bGwsICdkZXN0cm95JylcbiAgICAsIHJlbW92ZTogcmVtb3ZlXG4gIH1cblxuICBmdW5jdGlvbiBlYWNoKHR5cGUsIGVsKSB7XG4gICAgdmFyIG5vZGVzID0gY2hpbGRyZW4oKVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbm9kZXNbaV1bdHlwZV0gJiYgbm9kZXNbaV1bdHlwZV0oZWwpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGVsLCByZWFkeSkge1xuICAgIGFsdHIucmVtb3ZlKGNoaWxkcmVuKCksIGVsLCByZWFkeSlcbiAgfVxufSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG5cbmZ1bmN0aW9uIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICB2YXIgcmFmID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgdGltZW91dFxuXG4gIHJldHVybiByYWYoY2FsbGJhY2spXG5cbiAgZnVuY3Rpb24gdGltZW91dChjYWxsYmFjaykge1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApXG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlbW92ZVxuXG5mdW5jdGlvbiByZW1vdmUoaG9va3MsIGVsLCByZWFkeSkge1xuICB2YXIgcmVtYWluaW5nID0gaG9va3MubGVuZ3RoXG4gIHZhciBjID0gMFxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSByZW1haW5pbmc7IGkgPCBsOyBpKyspIHtcbiAgICBob29rc1tpXS5yZW1vdmUgPyBob29rc1tpXS5yZW1vdmUoZWwsIGRvbmUpIDogLS1yZW1haW5pbmdcbiAgfVxuXG4gIGlmKCFyZW1haW5pbmcpIHtcbiAgICByZWFkeSgpXG4gIH1cblxuICBmdW5jdGlvbiBkb25lKCkge1xuICAgIGlmKCEtLXJlbWFpbmluZykge1xuICAgICAgcmVtYWluaW5nID0gLTFcbiAgICAgIHJlYWR5KClcbiAgICB9XG4gIH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHJlbmRlclxuXG5mdW5jdGlvbiByZW5kZXIodGVtcGxhdGUsIHN0YXRlLCBlbCkge1xuICBpZih0aGlzLmluY2x1ZGVzW3RlbXBsYXRlXSkge1xuICAgIHRlbXBsYXRlID0gdGhpcy5pbmNsdWRlc1t0ZW1wbGF0ZV1cbiAgfVxuXG4gIHZhciBpbnN0YW5jZSA9IHRoaXModGVtcGxhdGUpXG5cbiAgaW5zdGFuY2UudXBkYXRlKHN0YXRlIHx8IHt9LCB0cnVlKVxuXG4gIGlmKGVsKSB7XG4gICAgaW5zdGFuY2UuaW50byhlbClcbiAgfVxuXG4gIHJldHVybiBpbnN0YW5jZVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBydW5Ib29rc1xuXG5mdW5jdGlvbiBydW5Ib29rcyhob29rcywgdHlwZSwgZWwpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IGhvb2tzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGhvb2tzW2ldW3R5cGVdICYmIGhvb2tzW2ldW3R5cGVdKGVsKVxuICB9XG59XG4iLCJ2YXIgZ2V0ID0gcmVxdWlyZSgnLi9nZXQtZWxlbWVudCcpXG5cbm1vZHVsZS5leHBvcnRzID0gc2V0Q2hpbGRyZW5cblxuZnVuY3Rpb24gc2V0Q2hpbGRyZW4ocm9vdCwgbm9kZXMpIHtcbiAgdmFyIHByZXYgPSBudWxsXG4gICAgLCBlbFxuXG4gIGZvcih2YXIgaSA9IG5vZGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgZWwgPSBnZXQobm9kZXNbaV0pXG4gICAgcm9vdC5pbnNlcnRCZWZvcmUoZWwsIHByZXYpXG4gICAgcHJldiA9IGVsXG4gIH1cblxuICB3aGlsZSgoZWwgPSByb290LmZpcnN0Q2hpbGQpICE9PSBwcmV2KSB7XG4gICAgcm9vdC5yZW1vdmVDaGlsZChlbClcbiAgfVxufVxuIiwidmFyIHNldENoaWxkcmVuID0gcmVxdWlyZSgnLi4vc2V0LWNoaWxkcmVuJylcblxubW9kdWxlLmV4cG9ydHMgPSBjaGlsZHJlblxuXG5mdW5jdGlvbiBjaGlsZHJlbihlbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciBjdXJyZW50ID0gW11cblxuICBlbC5pbm5lckhUTUwgPSAnJ1xuICB0aGlzLmJhdGNoLmFkZChsb29rdXBzLm9uKGdldHRlciwgdXBkYXRlLmJpbmQodGhpcykpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICB2YXIgbm9kZXMgPSAoQXJyYXkuaXNBcnJheSh2YWwpID8gdmFsIDogW3ZhbF0pLmZpbHRlcihpc19ub2RlKVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYobm9kZXNbaV0gIT09IGN1cnJlbnRbaV0pIHtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSBub2Rlcy5sZW5ndGggPT09IGN1cnJlbnQubGVuZ3RoKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjdXJyZW50ID0gbm9kZXNcbiAgICBzZXRDaGlsZHJlbi5jYWxsKHRoaXMsIGVsLCBjdXJyZW50KVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzX25vZGUoZWwpIHtcbiAgcmV0dXJuIGVsICYmIGVsLm5vZGVUeXBlXG59XG4iLCJ2YXIgc2V0Q2hpbGRyZW4gPSByZXF1aXJlKCcuLi9zZXQtY2hpbGRyZW4nKVxudmFyIGZvclJlZ2V4cCA9IC9eKC4qPylcXHMraW5cXHMrKC4qJCkvXG5cbm1vZHVsZS5leHBvcnRzID0gZm9ySGFuZGxlclxuXG5mdW5jdGlvbiBmb3JIYW5kbGVyKHJvb3QsIGFyZ3MsIGxvb2t1cHMpIHtcbiAgdmFyIHRlbXBsYXRlID0gcm9vdC5jbG9uZU5vZGUodHJ1ZSlcbiAgdmFyIHBhcnRzID0gYXJncy5tYXRjaChmb3JSZWdleHApXG4gIHZhciBkb21Ob2RlcyA9IFtdXG4gIHZhciBjaGlsZHJlbiA9IFtdXG4gIHZhciBhbHRyID0gdGhpc1xuICB2YXIgaXRlbXMgPSBbXVxuXG4gIGlmKCFwYXJ0cykge1xuICAgIHJldHVybiBjb25zb2xlLmVycm9yKCdpbnZhbGlkIGBmb3JgIHRhZzogJyArIGFyZ3MpXG4gIH1cblxuICB2YXIgcnVuVXBkYXRlcyA9IGFsdHIuYmF0Y2guYWRkKHJ1bkRvbVVwZGF0ZXMpXG5cbiAgcm9vdC5pbm5lckhUTUwgPSAnJ1xuXG4gIHZhciB1bmlxdWUgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzFdXG4gIHZhciBwcm9wID0gcGFydHNbMV0uc3BsaXQoJzonKVswXVxuICB2YXIga2V5ID0gcGFydHNbMl1cblxuXG4gIGxvb2t1cHMub24oa2V5LCB1cGRhdGUpXG5cbiAgcmV0dXJuIGFsdHIubWVyZ2VIb29rcyhmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZmxhdHRlbihjaGlsZHJlbilcbiAgfSlcblxuICBmdW5jdGlvbiB1cGRhdGVDaGlsZHJlbihkYXRhKSB7XG4gICAgdmFyIGl0ZW1EYXRhXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpdGVtRGF0YSA9IE9iamVjdC5jcmVhdGUoZGF0YSlcbiAgICAgIGl0ZW1EYXRhW3Byb3BdID0gaXRlbXNbaV1cbiAgICAgIGl0ZW1EYXRhWyckaW5kZXgnXSA9IGlcbiAgICAgIGNoaWxkcmVuW2ldLmxvb2t1cHMudXBkYXRlKGl0ZW1EYXRhKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShuZXdJdGVtcykge1xuICAgIGlmKCFBcnJheS5pc0FycmF5KG5ld0l0ZW1zKSkge1xuICAgICAgbmV3SXRlbXMgPSBbXVxuICAgIH1cblxuICAgIHZhciBuZXdDaGlsZHJlbiA9IG5ldyBBcnJheShuZXdJdGVtcy5sZW5ndGgpXG4gICAgdmFyIHJlbW92ZWQgPSBbXVxuICAgIHZhciBtYXRjaGVkID0ge31cbiAgICB2YXIgYWRkZWQgPSBbXVxuICAgIHZhciBpbmRleFxuXG4gICAgZG9tTm9kZXMgPSBbXVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5ld0l0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaW5kZXggPSBmaW5kSW5kZXgoaXRlbXMsIG5ld0l0ZW1zW2ldLCB1bmlxdWUpXG5cbiAgICAgIGlmKGluZGV4ICE9PSAtMSkge1xuICAgICAgICBuZXdDaGlsZHJlbltpXSA9IGNoaWxkcmVuW2luZGV4XVxuICAgICAgICBpdGVtc1tpbmRleF0gPSBjaGlsZHJlbltpbmRleF0gPSBtYXRjaGVkXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZGRlZC5wdXNoKG5ld0NoaWxkcmVuW2ldID0gbWFrZUNoaWxkKCkpXG4gICAgICB9XG5cbiAgICAgIGRvbU5vZGVzID0gZG9tTm9kZXMuY29uY2F0KG5ld0NoaWxkcmVuW2ldLm5vZGVzKVxuICAgIH1cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGlmKGNoaWxkcmVuW2ldICE9PSBtYXRjaGVkKSB7XG4gICAgICAgIHJlbW92ZWQucHVzaChjaGlsZHJlbltpXSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG5ld0NoaWxkcmVuLnNsaWNlKClcbiAgICBpdGVtcyA9IG5ld0l0ZW1zLnNsaWNlKClcbiAgICB1cGRhdGVDaGlsZHJlbihsb29rdXBzLnN0YXRlKVxuICAgIGFsdHIuZGVzdHJveShmbGF0dGVuKHJlbW92ZWQpLCByb290LCBydW5VcGRhdGVzLmJpbmQoXG4gICAgICAgIGFsdHJcbiAgICAgICwgZG9tTm9kZXNcbiAgICAgICwgZmxhdHRlbihhZGRlZClcbiAgICApKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluZEluZGV4KGl0ZW1zLCBkLCB1bmlxdWUpIHtcbiAgICBpZighdW5pcXVlKSB7XG4gICAgICByZXR1cm4gaXRlbXMuaW5kZXhPZihkKVxuICAgIH1cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGlmKGl0ZW1zW2ldW3VuaXF1ZV0gPT09IGRbdW5pcXVlXSkge1xuICAgICAgICByZXR1cm4gaVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZUNoaWxkKCkge1xuICAgIHJldHVybiBhbHRyLmluaXROb2Rlcyh0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSkuY2hpbGROb2RlcylcbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bkRvbVVwZGF0ZXMoY2hpbGRyZW4sIGFkZGVkKSB7XG4gICAgc2V0Q2hpbGRyZW4uY2FsbCh0aGlzLCByb290LCBjaGlsZHJlbilcbiAgICBhbHRyLnJ1bkhvb2tzKGFkZGVkLCAnaW5zZXJ0Jywgcm9vdClcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGF0dGVuKGxpc3QpIHtcbiAgcmV0dXJuIGxpc3QucmVkdWNlKGZ1bmN0aW9uKGFsbCwgcGFydCkge1xuICAgIHJldHVybiBwYXJ0Lmhvb2tzID8gYWxsLmNvbmNhdChwYXJ0Lmhvb2tzKSA6IGFsbFxuICB9LCBbXSlcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGh0bWxcblxuZnVuY3Rpb24gaHRtbChlbCwgYWNjZXNzb3IsIGxvb2t1cHMpIHtcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuXG4gICAgaWYoZWwuZ2V0QXR0cmlidXRlKCdhbHRyLXJ1bi1zY3JpcHRzJykpIHtcbiAgICAgIFtdLmZvckVhY2guY2FsbChlbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JyksIHJ1bilcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuKHNjcmlwdCkge1xuICB2YXIgZml4ZWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgICwgcGFyZW50ID0gc2NyaXB0LnBhcmVudE5vZGVcbiAgICAsIGF0dHJzID0gc2NyaXB0LmF0dHJpYnV0ZXNcbiAgICAsIHNyY1xuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBmaXhlZC5zZXRBdHRyaWJ1dGUoYXR0cnNbaV0ubmFtZSwgYXR0cnNbaV0udmFsdWUpXG4gIH1cblxuICBmaXhlZC50ZXh0Q29udGVudCA9IHNjcmlwdC50ZXh0Q29udGVudFxuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGZpeGVkLCBzY3JpcHQpXG4gIHBhcmVudC5yZW1vdmVDaGlsZChzY3JpcHQpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlmVGFnXG5cbmZ1bmN0aW9uIGlmVGFnKGVsLCBnZXR0ZXIsIGxvb2t1cHMsIGRlY29yYXRvcnMpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcylcbiAgdmFyIGFsbCA9IGNoaWxkcmVuLmhvb2tzLmNvbmNhdChkZWNvcmF0b3JzKVxuICB2YXIgbGFzdFZhbCA9IG51bGxcbiAgdmFyIGhpZGRlbiA9IG51bGxcbiAgdmFyIGZpcnN0ID0gdHJ1ZVxuICB2YXIgYWx0ciA9IHRoaXNcblxuICB2YXIgdXBkYXRlID0gdGhpcy5iYXRjaC5hZGQoZnVuY3Rpb24oc2hvdywgb3JpZ2luKSB7XG4gICAgaWYoIWhpZGRlbiAmJiAhc2hvdykge1xuICAgICAgZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQocGxhY2Vob2xkZXIsIGVsKVxuICAgICAgZWwuX2FsdHJQbGFjZWhvbGRlciA9IHBsYWNlaG9sZGVyXG4gICAgICBoaWRkZW4gPSB0cnVlXG4gICAgfSBlbHNlIGlmKGhpZGRlbiAmJiBzaG93KSB7XG4gICAgICBwbGFjZWhvbGRlci5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChlbCwgcGxhY2Vob2xkZXIpXG4gICAgICBhbHRyLnJ1bkhvb2tzKGFsbCwgJ2luc2VydCcsIG9yaWdpbilcbiAgICAgIGRlbGV0ZSBlbC5fYWx0clBsYWNlaG9sZGVyXG4gICAgICBoaWRkZW4gPSBmYWxzZVxuICAgIH0gZWxzZSBpZihmaXJzdCkge1xuICAgICAgZmlyc3QgPSBmYWxzZVxuICAgICAgYWx0ci5ydW5Ib29rcyhhbGwsICdpbnNlcnQnLCBvcmlnaW4pXG4gICAgfVxuICB9KVxuXG4gIGxvb2t1cHMub24oZ2V0dGVyLCB0b2dnbGUsIHRydWUpXG5cbiAgcmV0dXJuIHtcbiAgICAgIGluc2VydDogaW5zZXJ0XG4gICAgLCByZW1vdmU6IHJlbW92ZVxuICAgICwgZGVzdHJveTogZGVzdHJveVxuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveShlbCkge1xuICAgIGFsdHIucnVuSG9va3MoY2hpbGRyZW4uaG9va3MsICdkZXN0cm95JywgZWwpXG4gIH1cblxuICBmdW5jdGlvbiB0b2dnbGUodmFsKSB7XG4gICAgbGFzdFZhbCA9IHZhbFxuXG4gICAgaWYodmFsKSB7XG4gICAgICB1cGRhdGUodHJ1ZSwgZWwpXG4gICAgICBjaGlsZHJlbi5sb29rdXBzLnVwZGF0ZShsb29rdXBzLnN0YXRlKVxuICAgIH0gZWxzZSB7XG4gICAgICBhbHRyLnJlbW92ZShhbGwsIGVsLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZShmYWxzZSwgZWwpXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGluc2VydChlbCkge1xuICAgIGlmKGxhc3RWYWwpIHtcbiAgICAgIHVwZGF0ZSh0cnVlLCBlbClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUoZWwsIGRvbmUpIHtcbiAgICBpZihoaWRkZW4pIHtcbiAgICAgIGRvbmUoKVxuXG4gICAgICByZXR1cm4gdXBkYXRlKGZhbHNlKVxuICAgIH1cblxuICAgIGFsdHIucmVtb3ZlKGNoaWxkcmVuLmhvb2tzLCBlbCwgZnVuY3Rpb24oKSB7XG4gICAgICB1cGRhdGUoZmFsc2UpXG4gICAgICBkb25lKClcbiAgICB9KVxuICB9XG59XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gaW5jbHVkZVxuXG5mdW5jdGlvbiBpbmNsdWRlKGVsLCBuYW1lLCBsb29rdXBzKSB7XG4gIHZhciByZW1vdmluZyA9IGZhbHNlXG4gIHZhciBjaGlsZHJlbiA9IG51bGxcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgbG9va3Vwcy5vbigndGhpcycsIHVwZGF0ZSlcblxuICByZXR1cm4ge2luc2VydDogaW5zZXJ0LCByZW1vdmU6IHJlbW92ZSwgZGVzdHJveTogZGVzdHJveX1cblxuICBmdW5jdGlvbiBpbnNlcnQoKSB7XG4gICAgaWYoY2hpbGRyZW4pIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGVsLmlubmVySFRNTCA9IGFsdHIuaW5jbHVkZXNbbmFtZV1cbiAgICBjaGlsZHJlbiA9IGFsdHIuaW5pdE5vZGVzKGVsLmNoaWxkTm9kZXMsIG51bGwsIGxvb2t1cHMuc3RhdGUpXG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUoZWwsIGRvbmUpIHtcbiAgICBpZighY2hpbGRyZW4gfHwgcmVtb3ZpbmcpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNoaWxkcmVuID0gbnVsbFxuICAgIHJlbW92aW5nID0gdHJ1ZVxuICAgIGFsdHIuZGVzdHJveShjaGlsZHJlbiwgZWwsIGZ1bmN0aW9uKCkge1xuICAgICAgcmVtb3ZpbmcgPSBmYWxzZVxuXG4gICAgICBpZighY2hpbGRyZW4pIHtcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gJydcbiAgICAgIH1cblxuICAgICAgZG9uZSgpXG4gICAgfSlcblxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHN0YXRlKSB7XG4gICAgY2hpbGRyZW4gJiYgY2hpbGRyZW4ubG9va3Vwcy51cGRhdGUoc3RhdGUpXG4gIH1cblxuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGxvb2t1cHMucmVtb3ZlTGlzdGVuZXIoJ3RoaXMnLCB1cGRhdGUpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcGxhY2Vob2xkZXJcblxuZnVuY3Rpb24gcGxhY2Vob2xkZXIob3JpZ2luYWwsIGdldHRlciwgbG9va3Vwcykge1xuICB2YXIgY3VycmVudCA9IG9yaWdpbmFsXG4gICAgLCBhbHRyID0gdGhpc1xuXG4gIHRoaXMuYmF0Y2guYWRkKGxvb2t1cHMub24oZ2V0dGVyLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBpZighdmFsIHx8ICF2YWwubm9kZU5hbWUgfHwgdmFsID09PSBjdXJyZW50KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjdXJyZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHZhbCwgY3VycmVudClcbiAgICBvcmlnaW5hbC5fYWx0clBsYWNlaG9sZGVyID0gdmFsXG4gICAgY3VycmVudCA9IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJhdygpIHt9XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRleHRcblxuZnVuY3Rpb24gdGV4dChlbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHRoaXMuYmF0Y2guYWRkKGxvb2t1cHMub24oZ2V0dGVyLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3aXRoVGFnXG5cbmZ1bmN0aW9uIHdpdGhUYWcoZWwsIGdldHRlciwgbG9va3Vwcykge1xuICB2YXIgY2hpbGRyZW4gPSB0aGlzLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzKVxuICAgICwgcGFydHMgPSBnZXR0ZXIuc3BsaXQoJyBhcyAnKVxuXG4gIGxvb2t1cHMub24ocGFydHNbMF0sIHVwZGF0ZSlcblxuICByZXR1cm4gY2hpbGRyZW4uaG9va3NcblxuICBmdW5jdGlvbiB1cGRhdGUoX3ZhbCkge1xuICAgIHZhciB2YWwgPSBPYmplY3QuY3JlYXRlKGxvb2t1cHMuc3RhdGUpXG5cbiAgICB2YWxbcGFydHNbMV1dID0gX3ZhbFxuICAgIGNoaWxkcmVuLmxvb2t1cHMudXBkYXRlKHZhbClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0U3RyaW5nXG5cbmZ1bmN0aW9uIHRlbXBsYXRTdHJpbmcodGVtcGxhdGUsIGNoYW5nZSwgbG9va3Vwcykge1xuICBpZighdGVtcGxhdGUubWF0Y2godGhpcy50YWdSZWdFeHApKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGVtcGxhdGVcbiAgICAsIHBhcnRzID0gW11cbiAgICAsIGhvb2tzID0gW11cbiAgICAsIGluZGV4XG4gICAgLCBuZXh0XG5cbiAgd2hpbGUocmVtYWluaW5nICYmIChuZXh0ID0gcmVtYWluaW5nLm1hdGNoKHRoaXMudGFnUmVnRXhwKSkpIHtcbiAgICBpZihpbmRleCA9IHJlbWFpbmluZy5pbmRleE9mKG5leHRbMF0pKSB7XG4gICAgICBwYXJ0cy5wdXNoKHJlbWFpbmluZy5zbGljZSgwLCBpbmRleCkpXG4gICAgfVxuXG4gICAgcGFydHMucHVzaCgnJylcbiAgICByZW1haW5pbmcgPSByZW1haW5pbmcuc2xpY2UoaW5kZXggKyBuZXh0WzBdLmxlbmd0aClcbiAgICBsb29rdXBzLm9uKG5leHRbMV0sIHNldFBhcnQuYmluZCh0aGlzLCBwYXJ0cy5sZW5ndGggLSAxKSlcbiAgfVxuXG4gIGlmKHJlbWFpbmluZykge1xuICAgIHNldFBhcnQocGFydHMubGVuZ3RoLCByZW1haW5pbmcpXG4gIH1cblxuICBmdW5jdGlvbiBzZXRQYXJ0KGlkeCwgdmFsKSB7XG4gICAgcGFydHNbaWR4XSA9IHZhbFxuXG4gICAgY2hhbmdlKHBhcnRzLmpvaW4oJycpKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluaXRUZXh0Tm9kZVxuXG5mdW5jdGlvbiBpbml0VGV4dE5vZGUoZWwsIGxvb2t1cHMpIHtcbiAgdGhpcy50ZW1wbGF0ZVN0cmluZyhcbiAgICAgIGVsLnRleHRDb250ZW50XG4gICAgLCB0aGlzLmJhdGNoLmFkZCh1cGRhdGUpXG4gICAgLCBsb29rdXBzXG4gIClcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0b1N0cmluZ1xuXG5mdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgcmV0dXJuIHRoaXMucm9vdE5vZGVzKCkubWFwKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBzd2l0Y2gobm9kZS5ub2RlVHlwZSkge1xuICAgICAgY2FzZSB0aGlzLmRvY3VtZW50LkRPQ1VNRU5UX0ZSQUdNRU5UX05PREU6XG4gICAgICBjYXNlIHRoaXMuZG9jdW1lbnQuQ09NTUVOVF9OT0RFOiByZXR1cm4gY2xvbmUuY2FsbCh0aGlzLCBub2RlKVxuICAgICAgY2FzZSB0aGlzLmRvY3VtZW50LlRFWFRfTk9ERTogcmV0dXJuIG5vZGUudGV4dENvbnRlbnRcbiAgICAgIGRlZmF1bHQ6IHJldHVybiBub2RlLm91dGVySFRNTFxuICAgIH1cbiAgfSwgdGhpcykuam9pbignJylcblxuICBmdW5jdGlvbiBjbG9uZShub2RlKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmFwcGVuZENoaWxkKG5vZGUuY2xvbmVOb2RlKHRydWUpKVxuXG4gICAgcmV0dXJuIHRlbXAuaW5uZXJIVE1MXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQmF0Y2hcblxuZnVuY3Rpb24gQmF0Y2gocmVhZHksIGFsbCkge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCYXRjaCkpIHtcbiAgICByZXR1cm4gbmV3IEJhdGNoKHJlYWR5LCBhbGwpXG4gIH1cblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLmFsbCA9IGFsbFxuICB0aGlzLnJlYWR5ID0gcmVhZHlcbiAgdGhpcy5xdWV1ZCA9IGZhbHNlXG4gIHRoaXMucnVuID0gdGhpcy5ydW4uYmluZCh0aGlzKVxufVxuXG5CYXRjaC5wcm90b3R5cGUucXVldWUgPSBxdWV1ZVxuQmF0Y2gucHJvdG90eXBlLmFkZCA9IGFkZFxuQmF0Y2gucHJvdG90eXBlLnJ1biA9IHJ1blxuXG5mdW5jdGlvbiBhZGQoZm4pIHtcbiAgdmFyIHF1ZXVlZCA9IGZhbHNlXG4gICAgLCBiYXRjaCA9IHRoaXNcbiAgICAsIHNlbGZcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gcXVldWVcblxuICBmdW5jdGlvbiBxdWV1ZSgpIHtcbiAgICBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgc2VsZiA9IHRoaXNcblxuICAgIGlmKHF1ZXVlZCkge1xuICAgICAgcmV0dXJuIGJhdGNoLmFsbCAmJiBiYXRjaC5yZWFkeSgpXG4gICAgfVxuXG4gICAgcXVldWVkID0gdHJ1ZVxuICAgIGJhdGNoLnF1ZXVlKHJ1bilcbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICBxdWV1ZWQgPSBmYWxzZVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVldWUoZm4pIHtcbiAgdGhpcy5qb2JzLnB1c2goZm4pXG5cbiAgaWYodGhpcy5hbGwgfHwgIXRoaXMucXVldWVkKSB7XG4gICAgdGhpcy5xdWV1ZWQgPSB0cnVlXG4gICAgdGhpcy5yZWFkeSh0aGlzKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNcblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLnF1ZXVlZCA9IGZhbHNlXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGpvYnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgam9ic1tpXSgpXG4gIH1cblxuICByZXR1cm4gISFqb2JzLmxlbmd0aFxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBFeHByZXNzaW9uXHJcblxyXG5mdW5jdGlvbiBFeHByZXNzaW9uKHBhcnNlZCwgZGVwcywgdmFsdWUsIGhhbmRsZXIpIHtcclxuICB0aGlzLmRlcGVuZGVudHMgPSBbXVxyXG4gIHRoaXMuZGVwcyA9IGRlcHNcclxuICB0aGlzLnBhcnNlZCA9IHBhcnNlZFxyXG4gIHRoaXMuY2hhbmdlZCA9IGZhbHNlXHJcbiAgdGhpcy5yZW1vdmFibGUgPSB0cnVlXHJcbiAgdGhpcy52YWx1ZSA9IHZhbHVlXHJcbiAgdGhpcy51cGRhdGUgPSB1cGRhdGUuYmluZCh0aGlzKVxyXG4gIHRoaXMuaGFuZGxlciA9IGhhbmRsZXJcclxuXHJcbiAgZm9yKHZhciBpID0gMCwgbCA9IGRlcHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XHJcbiAgICBkZXBzW2ldLmRlcGVuZGVudHMucHVzaCh0aGlzKVxyXG4gIH1cclxufVxyXG5cclxuRXhwcmVzc2lvbi5wcm90b3R5cGUuY2hhbmdlID0gY2hhbmdlXHJcbkV4cHJlc3Npb24ucHJvdG90eXBlLnVwZGF0ZSA9IHVwZGF0ZVxyXG5cclxuZnVuY3Rpb24gY2hhbmdlKHZhbCkge1xyXG4gIGlmKHRoaXMudmFsdWUgPT09IHZhbCAmJiAoIXRoaXMudmFsdWUgfHwgdHlwZW9mIHRoaXMudmFsdWUgIT09ICdvYmplY3QnKSkge1xyXG4gICAgcmV0dXJuXHJcbiAgfVxyXG5cclxuICB0aGlzLnZhbHVlID0gdmFsXHJcbiAgdGhpcy5jaGFuZ2VkID0gdHJ1ZVxyXG5cclxuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5kZXBlbmRlbnRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xyXG4gICAgdGhpcy5kZXBlbmRlbnRzW2ldLnVwZGF0ZSgpXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGUoKSB7XHJcbiAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkodGhpcy5kZXBzLmxlbmd0aClcclxuXHJcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuZGVwcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcclxuICAgIGFyZ3NbaV0gPSB0aGlzLmRlcHNbaV0udmFsdWVcclxuICB9XHJcblxyXG4gIHRoaXMuaGFuZGxlci5hcHBseShudWxsLCBhcmdzKVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gaGFzaFxyXG5cclxuZnVuY3Rpb24gaGFzaChzdHIpIHtcclxuICB2YXIgdmFsID0gMFxyXG5cclxuICBmb3IodmFyIGkgPSAwLCBsZW4gPSBzdHIubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgIHZhbCA9ICgodmFsIDw8IDUpIC0gdmFsKSArIHN0ci5jaGFyQ29kZUF0KGkpXHJcbiAgICB2YWwgfD0gMFxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHZhbC50b1N0cmluZygpLnJlcGxhY2UoJy0nLCAnXycpXHJcbn1cclxuIiwidmFyIEV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKVxyXG52YXIgcmVtb3ZlID0gcmVxdWlyZSgnLi9yZW1vdmUnKVxyXG52YXIgdHlwZXMgPSByZXF1aXJlKCcuL3R5cGVzJylcclxudmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpXHJcbnZhciBzcGxpdCA9IHJlcXVpcmUoJy4vc3BsaXQnKVxyXG52YXIgd2F0Y2ggPSByZXF1aXJlKCcuL3dhdGNoJylcclxudmFyIGhhc2ggPSByZXF1aXJlKCcuL2hhc2gnKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEaXJ0eUJpdFxyXG5cclxuZnVuY3Rpb24gRGlydHlCaXQoc3RhdGUsIG9wdGlvbnMpIHtcclxuICBpZighKHRoaXMgaW5zdGFuY2VvZiBEaXJ0eUJpdCkpIHtcclxuICAgIHJldHVybiBuZXcgRGlydHlCaXQoc3RhdGUsIG9wdGlvbnMpXHJcbiAgfVxyXG5cclxuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcblxyXG4gIHRoaXMucGFydGlhbHMgPSB7fVxyXG4gIHRoaXMuc3RhdGUgPSBzdGF0ZSB8fCB7fVxyXG4gIHRoaXMuZmlsdGVycyA9IE9iamVjdC5jcmVhdGUodGhpcy5vcHRpb25zLmZpbHRlcnMgfHwgbnVsbClcclxuICB0aGlzLnJvb3RLZXkgPSB0aGlzLm9wdGlvbnMucm9vdEtleVxyXG5cclxuICB0aGlzLnJvb3RFeHByZXNzaW9uID0gbmV3IEV4cHJlc3Npb24oJ3RoaXMnLCBbXSwgdGhpcy5zdGF0ZSlcclxuXHJcbiAgdGhpcy5leHByZXNzaW9ucyA9IHt9XHJcbiAgdGhpcy5oYW5kbGVycyA9IHt9XHJcbiAgdGhpcy5oYW5kbGVyTGlzdCA9IFtdXHJcblxyXG4gIHRoaXMuZXhwcmVzc2lvbnNbJ3RoaXMnXSA9IHRoaXMucm9vdEV4cHJlc3Npb25cclxuICB0aGlzLnJvb3RFeHByZXNzaW9uLnJlbW92YWJsZSA9IGZhbHNlXHJcblxyXG4gIGlmKHRoaXMucm9vdEtleSkge1xyXG4gICAgdGhpcy5leHByZXNzaW9uc1t0aGlzLnJvb3RLZXldID0gdGhpcy5yb290RXhwcmVzc2lvblxyXG4gIH1cclxuXHJcbiAgdGhpcy51cGRhdGluZyA9IGZhbHNlXHJcbn1cclxuXHJcbkRpcnR5Qml0LnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IHJlbW92ZVxyXG5EaXJ0eUJpdC5wcm90b3R5cGUuYWRkRmlsdGVyID0gYWRkRmlsdGVyXHJcbkRpcnR5Qml0LnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcclxuRGlydHlCaXQucHJvdG90eXBlLnJlcG9ydCA9IHJlcG9ydFxyXG5EaXJ0eUJpdC5wcm90b3R5cGUudHlwZXMgPSB0eXBlc1xyXG5EaXJ0eUJpdC5wcm90b3R5cGUuc3BsaXQgPSBzcGxpdFxyXG5EaXJ0eUJpdC5wcm90b3R5cGUucGFyc2UgPSBwYXJzZVxyXG5EaXJ0eUJpdC5wcm90b3R5cGUud2F0Y2ggPSB3YXRjaFxyXG5EaXJ0eUJpdC5wcm90b3R5cGUuaGFzaCA9IGhhc2hcclxuRGlydHlCaXQucHJvdG90eXBlLnRyaW0gPSB0cmltXHJcbkRpcnR5Qml0LnByb3RvdHlwZS5vbiA9IG9uXHJcblxyXG5EaXJ0eUJpdC5wYXJzZWQgPSB7fVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlKHN0YXRlKSB7XHJcbiAgdGhpcy5zdGF0ZSA9IHN0YXRlXHJcbiAgdGhpcy51cGRhdGluZyA9IHRydWVcclxuICB0aGlzLnJvb3RFeHByZXNzaW9uLmNoYW5nZShzdGF0ZSlcclxuICB0aGlzLnVwZGF0aW5nID0gZmFsc2VcclxuICB0aGlzLnJlcG9ydCgpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlcG9ydCgpIHtcclxuICB2YXIgZXhwcmVzc2lvblxyXG4gIHZhciBsb29rdXBcclxuXHJcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuaGFuZGxlckxpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XHJcbiAgICBsb29rdXAgPSB0aGlzLmhhbmRsZXJMaXN0W2ldXHJcbiAgICBleHByZXNzaW9uID0gdGhpcy5leHByZXNzaW9uc1tsb29rdXBdXHJcblxyXG4gICAgaWYoIWV4cHJlc3Npb24uY2hhbmdlZCkge1xyXG4gICAgICBjb250aW51ZVxyXG4gICAgfVxyXG5cclxuICAgIGZvcih2YXIgaiA9IDAsIGwyID0gdGhpcy5oYW5kbGVyc1tsb29rdXBdLmxlbmd0aDsgaiA8IGwyOyArK2opIHtcclxuICAgICAgdGhpcy5oYW5kbGVyc1tsb29rdXBdW2pdKGV4cHJlc3Npb24udmFsdWUpXHJcbiAgICB9XHJcblxyXG4gICAgZXhwcmVzc2lvbi5jaGFuZ2VkID0gZmFsc2VcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZEZpbHRlcihuYW1lLCBmaWx0ZXIpIHtcclxuICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmaWx0ZXJcclxufVxyXG5cclxuZnVuY3Rpb24gdHJpbShzdHIpIHtcclxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbihfbG9va3VwLCBoYW5kbGVyKSB7XHJcbiAgdmFyIGxvb2t1cCA9IHRoaXMudHJpbShfbG9va3VwKVxyXG5cclxuICBpZih0aGlzLmhhbmRsZXJzW2xvb2t1cF0pIHtcclxuICAgIHRoaXMuaGFuZGxlcnNbbG9va3VwXS5wdXNoKGhhbmRsZXIpXHJcblxyXG4gICAgcmV0dXJuIGhhbmRsZXIodGhpcy5leHByZXNzaW9uc1tsb29rdXBdLnZhbHVlKVxyXG4gIH1cclxuXHJcbiAgdGhpcy51cGRhdGluZyA9IHRydWVcclxuICB0aGlzLndhdGNoKGxvb2t1cClcclxuICB0aGlzLmhhbmRsZXJMaXN0LnB1c2gobG9va3VwKVxyXG4gIHRoaXMuaGFuZGxlcnNbbG9va3VwXSA9IFtoYW5kbGVyXVxyXG4gIHRoaXMudXBkYXRpbmcgPSBmYWxzZVxyXG4gIGhhbmRsZXIodGhpcy5leHByZXNzaW9uc1tsb29rdXBdLnZhbHVlKVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcGFyc2VcclxuXHJcbmZ1bmN0aW9uIHBhcnNlKGxvb2t1cCkge1xyXG4gIHZhciB2YWxcclxuXHJcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMudHlwZXMub3JkZXIubGVuZ3RoOyBpIDwgbDsgKytpKSB7XHJcbiAgICB2YWwgPSB0aGlzLnR5cGVzLnR5cGVzW3RoaXMudHlwZXMub3JkZXJbaV1dLnBhcnNlLmNhbGwodGhpcywgbG9va3VwKVxyXG5cclxuICAgIGlmKHZhbCkge1xyXG4gICAgICBicmVha1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFsLnR5cGUgPSB0aGlzLnR5cGVzLm9yZGVyW2ldXHJcbiAgdmFsLmxvb2t1cCA9IGxvb2t1cFxyXG5cclxuICByZXR1cm4gdmFsXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSByZW1vdmVcclxuXHJcbmZ1bmN0aW9uIHJlbW92ZShfbG9va3VwLCBoYW5kbGVyKSB7XHJcbiAgdmFyIGxvb2t1cCA9IHRoaXMudHJpbShfbG9va3VwKVxyXG4gIHZhciBoYW5kbGVycyA9IHRoaXMuaGFuZGxlcnNbbG9va3VwXVxyXG5cclxuICBpZighaGFuZGxlcnMpIHtcclxuICAgIHJldHVyblxyXG4gIH1cclxuXHJcbiAgdmFyIGluZGV4ID0gaGFuZGxlcnMuaW5kZXhPZihoYW5kbGVyKVxyXG5cclxuICBpZihpbmRleCA8IDApIHtcclxuICAgIHJldHVyblxyXG4gIH1cclxuXHJcbiAgaGFuZGxlcnMuc3BsaWNlKGluZGV4LCAxKVxyXG5cclxuICBpZih0aGlzLmhhbmRsZXJzW2xvb2t1cF0ubGVuZ3RoKSB7XHJcbiAgICByZXR1cm5cclxuICB9XHJcblxyXG4gIGRlbGV0ZSB0aGlzLmhhbmRsZXJzW2xvb2t1cF1cclxuICB0aGlzLmhhbmRsZXJMaXN0LnNwbGljZSh0aGlzLmhhbmRsZXJMaXN0LmluZGV4T2YobG9va3VwKSwgMSlcclxuICByZW1vdmVFeHByZXNzaW9uKHRoaXMsIHRoaXMuZXhwcmVzc2lvbnNbbG9va3VwXSlcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlRXhwcmVzc2lvbihzZWxmLCBleHByZXNzaW9uKSB7XHJcbiAgaWYoZXhwcmVzc2lvbi5kZXBlbmRlbnRzLmxlbmd0aCB8fCAhZXhwcmVzc2lvbi5yZW1vdmFibGUpIHtcclxuICAgIHJldHVyblxyXG4gIH1cclxuXHJcbiAgZGVsZXRlIHNlbGYuZXhwcmVzc2lvbnNbZXhwcmVzc2lvbi5wYXJzZWQubG9va3VwXVxyXG5cclxuICBmb3IodmFyIGkgPSAwLCBsID0gZXhwcmVzc2lvbi5kZXBzLmxlbmd0aCwgZGVwOyBpIDwgbDsgKytpKSB7XHJcbiAgICBkZXAgPSBleHByZXNzaW9uLmRlcHNbaV1cclxuICAgIGRlcC5kZXBlbmRlbnRzLnNwbGljZShkZXAuZGVwZW5kZW50cy5pbmRleE9mKGV4cHJlc3Npb24pLCAxKVxyXG4gICAgcmVtb3ZlRXhwcmVzc2lvbihzZWxmLCBkZXApXHJcbiAgfVxyXG59XHJcbiIsInZhciBkZWZhdWx0X3BhaXJzID0gW1xyXG4gICAgWycoJywgJyknXVxyXG4gICwgWydbJywgJ10nXVxyXG4gICwgWyc/JywgJzonXVxyXG4gICwgWydcIicsICdcIicsIHRydWVdXHJcbiAgLCBbXCInXCIsIFwiJ1wiLCB0cnVlXVxyXG5dXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHNwbGl0XHJcbm1vZHVsZS5leHBvcnRzLnBhaXJzID0gZGVmYXVsdF9wYWlyc1xyXG5cclxuZnVuY3Rpb24gc3BsaXQocGFydHMsIGtleSwgYWxsLCBfcGFpcnMpIHtcclxuICB2YXIgcGFpcnMgPSBfcGFpcnMgfHwgZGVmYXVsdF9wYWlyc1xyXG4gICAgLCBpblN0cmluZyA9IGZhbHNlXHJcbiAgICAsIGxheWVycyA9IFtdXHJcblxyXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcclxuICAgIGlmKCF+cGFydHMuaW5kZXhPZihrZXkpKSB7XHJcbiAgICAgIGkgPSBsXHJcblxyXG4gICAgICBicmVha1xyXG4gICAgfVxyXG5cclxuICAgIGlmKCFsYXllcnMubGVuZ3RoKSB7XHJcbiAgICAgIGZvcih2YXIgaiA9IDAsIGwyID0ga2V5Lmxlbmd0aDsgaiA8IGwyOyArK2opIHtcclxuICAgICAgICBpZihwYXJ0c1tpICsgal0gIT09IGtleVtqXSkge1xyXG4gICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKGogPT09IGtleS5sZW5ndGgpIHtcclxuICAgICAgICBicmVha1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYobGF5ZXJzLmxlbmd0aCAmJiBsYXllcnNbbGF5ZXJzLmxlbmd0aCAtIDFdID09PSBwYXJ0c1tpXSkge1xyXG4gICAgICBpblN0cmluZyA9IGZhbHNlXHJcbiAgICAgIGxheWVycy5wb3AoKVxyXG5cclxuICAgICAgY29udGludWVcclxuICAgIH1cclxuXHJcbiAgICBpZihpblN0cmluZykge1xyXG4gICAgICBjb250aW51ZVxyXG4gICAgfVxyXG5cclxuICAgIGZvcih2YXIgaiA9IDAsIGwyID0gcGFpcnMubGVuZ3RoOyBqIDwgbDI7ICsraikge1xyXG4gICAgICBpZihwYXJ0c1tpXSA9PT0gcGFpcnNbal1bMF0pIHtcclxuICAgICAgICBpZihwYWlyc1tqXVsyXSkge1xyXG4gICAgICAgICAgaW5TdHJpbmcgPSB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsYXllcnMucHVzaChwYWlyc1tqXVsxXSlcclxuXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYobGF5ZXJzLmxlbmd0aCkge1xyXG4gICAgY29uc29sZS5lcnJvcihcclxuICAgICAgICAnVW5tYXRjaGVkIHBhaXIgaW4gJyArIHBhcnRzICsgJy4gZXhwZWN0aW5nOiAnICsgbGF5ZXJzLnBvcCgpXHJcbiAgICApXHJcbiAgfVxyXG5cclxuICBpZihpID09PSBwYXJ0cy5sZW5ndGgpIHtcclxuICAgIHJldHVybiBbcGFydHNdXHJcbiAgfVxyXG5cclxuICB2YXIgcmlnaHQgPSBwYXJ0cy5zbGljZShpICsga2V5Lmxlbmd0aClcclxuICAgICwgbGVmdCA9IHBhcnRzLnNsaWNlKDAsIGkpXHJcblxyXG4gIGlmKCFhbGwpIHtcclxuICAgIHJldHVybiBbbGVmdCwgcmlnaHRdXHJcbiAgfVxyXG5cclxuICByZXR1cm4gW2xlZnRdLmNvbmNhdChzcGxpdChyaWdodCwga2V5LCBhbGwsIHBhaXJzKSlcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVxyXG5tb2R1bGUuZXhwb3J0cy5wYXJzZSA9IHBhcnNlXHJcblxyXG52YXIgdGVzdHMgPSBbXVxyXG52YXIgb3BzID0ge31cclxuXHJcbmFkZChbJ3xcXFxcfCddKVxyXG5hZGQoWycmJiddKVxyXG5hZGQoWyd8J10pXHJcbmFkZChbJ14nXSlcclxuYWRkKFsnJiddKVxyXG5hZGQoWyc9PT0nLCAnIT09JywgJz09JywgJyE9J10pXHJcbmFkZChbJz49JywgJzw9JywgJz4nLCAnPCcsICcgaW4gJywgJyBpbnN0YW5jZW9mICddKVxyXG4vLyBhZGQoWyc8PCcsICc+PicsICc+Pj4nXSkgLy9jb25mbGljcyB3aXRoIDwgYW5kID5cclxuYWRkKFsnKycsICctJ10pXHJcbmFkZChbJyonLCAnLycsICclJ10pXHJcblxyXG5vcHNbJ2luJ10gPSB1cGRhdGVJblxyXG5vcHNbJ2luc3RhbmNlb2YnXSA9IHVwZGF0ZUluc3RhbmNlb2ZcclxuXHJcbmZ1bmN0aW9uIGFkZChsaXN0KSB7XHJcbiAgdGVzdHMucHVzaChuZXcgUmVnRXhwKCdeKC4rPykoXFxcXCcgKyBsaXN0LmpvaW4oJ3xcXFxcJykgKyAnKSguKykkJykpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlKGxvb2t1cCkge1xyXG4gIHZhciBwYXJ0c1xyXG5cclxuICBmb3IodmFyIGkgPSAwLCBsID0gdGVzdHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XHJcbiAgICBwYXJ0cyA9IGxvb2t1cC5tYXRjaCh0ZXN0c1tpXSlcclxuXHJcbiAgICBpZihwYXJ0cykge1xyXG4gICAgICBicmVha1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoIXBhcnRzKSB7XHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9XHJcblxyXG4gIHJldHVybiB7ZGVwczogW3BhcnRzWzFdLCBwYXJ0c1szXV0sIG9wdGlvbnM6IHBhcnRzWzJdfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGUoY2hhbmdlLCBvcCkge1xyXG4gIGlmKCFvcHNbb3BdKSB7XHJcbiAgICBvcHNbb3BdID0gY3JlYXRlT3Aob3ApXHJcbiAgfVxyXG5cclxuICByZXR1cm4gb3BzW29wXS5iaW5kKG51bGwsIGNoYW5nZSlcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlT3Aob3ApIHtcclxuICByZXR1cm4gRnVuY3Rpb24oJ2NoYW5nZSwgbGVmdCwgcmlnaHQnLCAnY2hhbmdlKGxlZnQgJyArIG9wICsgJyByaWdodCknKVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVJbihsZWZ0LCByaWdodCkge1xyXG4gIHJldHVybiB0eXBlb2YgcmlnaHQgIT09ICd1bmRlZmluZWQnICYmIGxlZnQgaW4gcmlnaHRcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlSW5zdGFuY2VvZihsZWZ0LCByaWdodCkge1xyXG4gIHJldHVybiB0eXBlb2YgcmlnaHQgPT09ICdmdW5jdGlvbicgJiYgbGVmdCBpbnN0YW5jZW9mIHJpZ2h0XHJcbn1cclxuIiwidmFyIGhhc19icmFja2V0ID0gL14uKlxcU1xcWy4rXFxdJC9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYnJhY2tldHNcclxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxyXG5cclxuZnVuY3Rpb24gcGFyc2UobG9va3VwKSB7XHJcbiAgaWYoIWhhc19icmFja2V0LnRlc3QobG9va3VwKSkge1xyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG5cclxuICB2YXIgcGFpcnMgPSB0aGlzLnNwbGl0LnBhaXJzLm1hcChmdW5jdGlvbihwYWlyKSB7XHJcbiAgICByZXR1cm4gW3BhaXJbMV0sIHBhaXJbMF0sIHBhaXJbMl1dXHJcbiAgfSlcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgICAgZGVwczogdGhpcy5zcGxpdChyZXZlcnNlKGxvb2t1cC5zbGljZSgwLCAtMSkpLCAnWycsIGZhbHNlLCBwYWlycylcclxuICAgICAgICAubWFwKHJldmVyc2UpXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZXZlcnNlKHN0cikge1xyXG4gIHJldHVybiBzdHIuc3BsaXQoJycpLnJldmVyc2UoKS5qb2luKCcnKVxyXG59XHJcblxyXG5mdW5jdGlvbiBicmFja2V0cyhjaGFuZ2UpIHtcclxuICByZXR1cm4gZnVuY3Rpb24oaW5uZXIsIHJvb3QpIHtcclxuICAgIGlmKHJvb3QgPT09IG51bGwgfHwgcm9vdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiBjaGFuZ2UoKVxyXG4gICAgfVxyXG5cclxuICAgIGNoYW5nZShyb290W2lubmVyXSlcclxuICB9XHJcbn1cclxuIiwidmFyIHZhbGlkX3BhdGggPSAvXiguKilcXC4oW14uXFxzXSspJC9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlXHJcbm1vZHVsZS5leHBvcnRzLnBhcnNlID0gcGFyc2VcclxuXHJcbmZ1bmN0aW9uIHBhcnNlKGxvb2t1cCkge1xyXG4gIHZhciBwYXJ0cyA9IGxvb2t1cC5tYXRjaCh2YWxpZF9wYXRoKVxyXG5cclxuICByZXR1cm4gcGFydHMgP1xyXG4gICAge2RlcHM6IFtwYXJ0c1sxXV0sIG9wdGlvbnM6IHBhcnRzWzJdfSA6XHJcbiAgICB7ZGVwczogWyd0aGlzJ10sIG9wdGlvbnM6IGxvb2t1cH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlKGNoYW5nZSwga2V5KSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xyXG4gICAgaWYob2JqID09PSBudWxsIHx8IG9iaiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiBjaGFuZ2UoKVxyXG4gICAgfVxyXG5cclxuICAgIGNoYW5nZShvYmpba2V5XSlcclxuICB9XHJcbn1cclxuIiwidmFyIGZpbHRlcl9yZWdleHAgPSAvXihbXlxccyhdKylcXCgoLiopXFwpJC9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlXHJcbm1vZHVsZS5leHBvcnRzLnBhcnNlID0gcGFyc2VcclxuXHJcbmZ1bmN0aW9uIHBhcnNlKGxvb2t1cCkge1xyXG4gIHZhciBwYXJ0cyA9IGxvb2t1cC5tYXRjaChmaWx0ZXJfcmVnZXhwKVxyXG5cclxuICBpZighcGFydHMpIHtcclxuICAgIHJldHVybiBmYWxzZVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtkZXBzOiB0aGlzLnNwbGl0KHBhcnRzWzJdLCAnLCcsIHRydWUpLCBvcHRpb25zOiBwYXJ0c1sxXX1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlKGNoYW5nZSwgbmFtZSkge1xyXG4gIHJldHVybiB0aGlzLmZpbHRlcnNbbmFtZV0oY2hhbmdlKSB8fCBmdW5jdGlvbigpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ2NvdWxkIG5vdCBmaW5kIGZpbHRlcjogJyArIG5hbWUpXHJcbiAgfVxyXG59XHJcbiIsInZhciBicmFja2V0cyA9IHJlcXVpcmUoJy4vYnJhY2tldHMnKVxyXG52YXIgZG90X3BhdGggPSByZXF1aXJlKCcuL2RvdC1wYXRoJylcclxudmFyIGZpbHRlcnMgPSByZXF1aXJlKCcuL2ZpbHRlcnMnKVxyXG52YXIgcGFydGlhbCA9IHJlcXVpcmUoJy4vcGFydGlhbCcpXHJcbnZhciB0ZXJuYXJ5ID0gcmVxdWlyZSgnLi90ZXJuYXJ5JylcclxudmFyIHBhcmVucyA9IHJlcXVpcmUoJy4vcGFyZW5zJylcclxudmFyIHZhbHVlcyA9IHJlcXVpcmUoJy4vdmFsdWVzJylcclxudmFyIGJpbmFyeSA9IHJlcXVpcmUoJy4vYmluYXJ5JylcclxudmFyIHVuYXJ5ID0gcmVxdWlyZSgnLi91bmFyeScpXHJcbnZhciBsaXN0ID0gcmVxdWlyZSgnLi9saXN0JylcclxuXHJcbm1vZHVsZS5leHBvcnRzLm9yZGVyID0gW1xyXG4gICAgJ3ZhbHVlcydcclxuICAsICdmaWx0ZXJzJ1xyXG4gICwgJ3BhcnRpYWwnXHJcbiAgLCAncGFyZW5zJ1xyXG4gICwgJ3Rlcm5hcnknXHJcbiAgLCAnYmluYXJ5J1xyXG4gICwgJ3VuYXJ5J1xyXG4gICwgJ2JyYWNrZXRzJ1xyXG4gICwgJ2xpc3QnXHJcbiAgLCAnZG90X3BhdGgnXHJcbl1cclxuXHJcbm1vZHVsZS5leHBvcnRzLnR5cGVzID0ge1xyXG4gICAgdmFsdWVzOiB2YWx1ZXNcclxuICAsIGZpbHRlcnM6IGZpbHRlcnNcclxuICAsIHBhcnRpYWw6IHBhcnRpYWxcclxuICAsIHBhcmVuczogcGFyZW5zXHJcbiAgLCB0ZXJuYXJ5OiB0ZXJuYXJ5XHJcbiAgLCBiaW5hcnk6IGJpbmFyeVxyXG4gICwgdW5hcnk6IHVuYXJ5XHJcbiAgLCBicmFja2V0czogYnJhY2tldHNcclxuICAsIGxpc3Q6IGxpc3RcclxuICAsIGRvdF9wYXRoOiBkb3RfcGF0aFxyXG59XHJcbiIsInZhciBpc19saXN0ID0gL15cXFsuK1xcXSQvXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGxpc3RcclxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxyXG5cclxuZnVuY3Rpb24gcGFyc2UobG9va3VwKSB7XHJcbiAgaWYoIWlzX2xpc3QudGVzdChsb29rdXApKSB7XHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9XHJcblxyXG4gIHJldHVybiB7ZGVwczogdGhpcy5zcGxpdChsb29rdXAuc2xpY2UoMSwgLTEpLCAnLCcsIHRydWUpfVxyXG59XHJcblxyXG5mdW5jdGlvbiBsaXN0KGNoYW5nZSkge1xyXG4gIHJldHVybiBmdW5jdGlvbigpIHtcclxuICAgIGNoYW5nZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXHJcbiAgfVxyXG59XHJcbiIsInZhciBwYXJlbnNfcmVnZXhwID0gLyhefFteMC05YS16QS1aXyRdKVxcKCguKikkL1xyXG5cclxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxyXG5cclxuZnVuY3Rpb24gcGFyc2UobG9va3VwKSB7XHJcbiAgdmFyIHBhcnRzID0gbG9va3VwLm1hdGNoKHBhcmVuc19yZWdleHApXHJcblxyXG4gIGlmKCFwYXJ0cykge1xyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG5cclxuICB2YXIgYm9keSA9IHRoaXMuc3BsaXQocGFydHNbMl0sICcpJylbMF1cclxuICB2YXIga2V5ID0gJ3t7cGFyZW5fJyArIHRoaXMuaGFzaChib2R5KSArICd9fSdcclxuICB2YXIgcGFydGlhbHMgPSB7fVxyXG5cclxuICBwYXJ0aWFsc1trZXldID0gYm9keVxyXG5cclxuICB2YXIgcGF0Y2hlZCA9IGxvb2t1cC5zbGljZSgwLCBsb29rdXAubGFzdEluZGV4T2YoW3BhcnRzWzJdXSkgLSAxKSArXHJcbiAgICBrZXkgKyBwYXJ0c1syXS5zbGljZShib2R5Lmxlbmd0aCArIDEpXHJcblxyXG4gIHJldHVybiB7cHJveHk6IHBhdGNoZWQsIHBhcnRpYWxzOiBwYXJ0aWFsc31cclxufVxyXG4iLCJ2YXIgcmVnZXhwID0gL15cXHtcXHtbI19cXHddK1xcfVxcfSQvXHJcblxyXG5tb2R1bGUuZXhwb3J0cy5wYXJzZSA9IHBhcnNlXHJcblxyXG5mdW5jdGlvbiBwYXJzZShsb29rdXApIHtcclxuICByZXR1cm4gcmVnZXhwLnRlc3QobG9va3VwKSA/IHtwcm94eTogdGhpcy5wYXJ0aWFsc1tsb29rdXBdfSA6IGZhbHNlXHJcbn1cclxuIiwidmFyIHRlcm5hcnlfcmVnZXhwID0gL15cXHMqKC4rPylcXHMqXFw/KC4qKVxccyokL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVcclxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxyXG5cclxuZnVuY3Rpb24gcGFyc2UobG9va3VwKSB7XHJcbiAgdmFyIHBhcnRzID0gbG9va3VwLm1hdGNoKHRlcm5hcnlfcmVnZXhwKVxyXG5cclxuICBpZighcGFydHMpIHtcclxuICAgIHJldHVybiBmYWxzZVxyXG4gIH1cclxuXHJcbiAgdmFyIHJlc3QgPSB0aGlzLnNwbGl0KHBhcnRzWzJdLCAnOicpXHJcblxyXG4gIGlmKHJlc3QubGVuZ3RoICE9PSAyKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdVbm1hdGNoZWQgdGVybmFyeSBpbjogJyArIGxvb2t1cClcclxuICB9XHJcblxyXG4gIHJldHVybiB7ZGVwczogW3BhcnRzWzFdLCByZXN0WzBdLCByZXN0WzFdXX1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlKGNoYW5nZSkge1xyXG4gIHJldHVybiBmdW5jdGlvbihvaywgbGVmdCwgcmlnaHQpIHtcclxuICAgIGNoYW5nZShvayA/IGxlZnQgOiByaWdodClcclxuICB9XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVcclxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxyXG5cclxudmFyIHRlc3QgPSBuZXcgUmVnRXhwKCdeKFxcXFwnICsgWychJywgJysnLCAnLScsICd+J10uam9pbignfFxcXFwnKSArICcpKC4rKSQnKVxyXG5cclxudmFyIG9wcyA9IHt9XHJcblxyXG5mdW5jdGlvbiBwYXJzZShsb29rdXApIHtcclxuICB2YXIgcGFydHMgPSBsb29rdXAubWF0Y2godGVzdClcclxuXHJcbiAgaWYoIXBhcnRzKSB7XHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9XHJcblxyXG4gIHJldHVybiB7ZGVwczogW3BhcnRzWzJdXSwgb3B0aW9uczogcGFydHNbMV19XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZShjaGFuZ2UsIG9wKSB7XHJcbiAgaWYoIW9wc1tvcF0pIHtcclxuICAgIG9wc1tvcF0gPSBjcmVhdGVfb3Aob3ApXHJcbiAgfVxyXG5cclxuICByZXR1cm4gb3BzW29wXS5iaW5kKG51bGwsIGNoYW5nZSlcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlX29wKG9wKSB7XHJcbiAgcmV0dXJuIEZ1bmN0aW9uKCdjaGFuZ2UsIHZhbCcsICdjaGFuZ2UoJyArIG9wICsgJ3ZhbCknKVxyXG59XHJcbiIsInZhciBzdHJpbmdfcmVnZXhwID0gL14oPzonKCg/OlteJ1xcXFxdfCg/OlxcXFwuKSkqKSd8XCIoKD86W15cIlxcXFxdfCg/OlxcXFwuKSkqKVwiKSQvXHJcbiAgLCBudW1iZXJfcmVnZXhwID0gL14oXFxkKig/OlxcLlxcZCspPykkL1xyXG5cclxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxyXG5cclxudmFyIHZhbHMgPSB7XHJcbiAgICAndHJ1ZSc6IHRydWVcclxuICAsICdmYWxzZSc6IGZhbHNlXHJcbiAgLCAnbnVsbCc6IG51bGxcclxuICAsICd1bmRlZmluZWQnOiB1bmRlZmluZWRcclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2UobG9va3VwKSB7XHJcbiAgaWYodmFscy5oYXNPd25Qcm9wZXJ0eShsb29rdXApKSB7XHJcbiAgICByZXR1cm4ge3ZhbHVlOiB2YWxzW2xvb2t1cF19XHJcbiAgfVxyXG5cclxuICBpZihudW1iZXJfcmVnZXhwLnRlc3QobG9va3VwKSkge1xyXG4gICAgcmV0dXJuIHt2YWx1ZTogK2xvb2t1cH1cclxuICB9XHJcblxyXG4gIGlmKHN0cmluZ19yZWdleHAudGVzdChsb29rdXApKSB7XHJcbiAgICByZXR1cm4ge3ZhbHVlOiBsb29rdXAuc2xpY2UoMSwgLTEpfVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgRXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvbicpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHdhdGNoXHJcblxyXG52YXIgc2VlbiA9IHt9XHJcblxyXG5mdW5jdGlvbiB3YXRjaChsb29rdXApIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuXHJcbiAgdmFyIHBhcnNlZCA9IHNlZW5bbG9va3VwXSB8fCAoc2Vlbltsb29rdXBdID0gc2VsZi5wYXJzZShsb29rdXApKVxyXG4gIHZhciBwYXJ0aWFscyA9IHBhcnNlZC5wYXJ0aWFscyAmJiBPYmplY3Qua2V5cyhwYXJzZWQucGFydGlhbHMpXHJcblxyXG4gIHZhciBoYW5kbGVyID0gY3JlYXRlSGFuZGxlci5jYWxsKHNlbGYsIHBhcnNlZCwgY2hhbmdlKVxyXG5cclxuICBpZihwYXJ0aWFscykge1xyXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRpYWxzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xyXG4gICAgICBzZWxmLnBhcnRpYWxzW3BhcnRpYWxzW2ldXSA9IHBhcnNlZC5wYXJ0aWFsc1twYXJ0aWFsc1tpXV1cclxuICAgICAgZ2V0RGVwLmNhbGwoc2VsZiwgc2VsZi5wYXJ0aWFsc1twYXJ0aWFsc1tpXV0pXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YXIgZXhwcmVzc2lvbiA9IGNyZWF0ZUV4cHJlc3Npb24uY2FsbChzZWxmLCBwYXJzZWQsIGhhbmRsZXIpXHJcblxyXG4gIHNlbGYuZXhwcmVzc2lvbnNbbG9va3VwXSA9IGV4cHJlc3Npb25cclxuXHJcbiAgaWYoZXhwcmVzc2lvbi5oYW5kbGVyKSB7XHJcbiAgICBleHByZXNzaW9uLnVwZGF0ZSgpXHJcbiAgfVxyXG5cclxuICByZXR1cm4gZXhwcmVzc2lvblxyXG5cclxuICBmdW5jdGlvbiBjaGFuZ2UodmFsKSB7XHJcbiAgICBpZihzZWxmLnVwZGF0aW5nKSB7XHJcbiAgICAgIHJldHVybiBleHByZXNzaW9uLmNoYW5nZSh2YWwpXHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi51cGRhdGluZyA9IHRydWVcclxuICAgIGV4cHJlc3Npb24uY2hhbmdlKHZhbClcclxuICAgIHNlbGYudXBkYXRpbmcgPSBmYWxzZVxyXG4gICAgc2VsZi5yZXBvcnQoKVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlSGFuZGxlcihwYXJzZWQsIGNoYW5nZSkge1xyXG4gIHZhciB0eXBlID0gdGhpcy50eXBlcy50eXBlc1twYXJzZWQudHlwZV1cclxuXHJcbiAgaWYodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgIHJldHVybiB0eXBlLmNhbGwodGhpcywgY2hhbmdlLCBwYXJzZWQub3B0aW9ucylcclxuICB9XHJcblxyXG4gIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUV4cHJlc3Npb24ocGFyc2VkLCBoYW5kbGVyKSB7XHJcbiAgdmFyIGRlcHMgPSBwYXJzZWQuZGVwcyA/IHBhcnNlZC5kZXBzLm1hcChnZXREZXAuYmluZCh0aGlzKSkgOiBbXVxyXG4gIHZhciBwcm94eSA9IHBhcnNlZC5wcm94eSAmJiBnZXREZXAuY2FsbCh0aGlzLCBwYXJzZWQucHJveHkpXHJcbiAgdmFyIGV4cHJlc3Npb25cclxuXHJcbiAgaWYocHJveHkpIHtcclxuICAgIHJldHVybiBleHByZXNzaW9uID0gbmV3IEV4cHJlc3Npb24ocGFyc2VkLCBbcHJveHldLCBwcm94eS52YWx1ZSwgZWNobylcclxuICB9XHJcblxyXG4gIHJldHVybiBuZXcgRXhwcmVzc2lvbihwYXJzZWQsIGRlcHMsIHBhcnNlZC52YWx1ZSwgaGFuZGxlcilcclxuXHJcbiAgZnVuY3Rpb24gZWNobyh2YWwpIHtcclxuICAgIGV4cHJlc3Npb24uY2hhbmdlKHZhbClcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldERlcChfbG9va3VwKSB7XHJcbiAgdmFyIGxvb2t1cCA9IHRoaXMudHJpbShfbG9va3VwKVxyXG5cclxuICByZXR1cm4gdGhpcy5leHByZXNzaW9uc1tsb29rdXBdIHx8IHRoaXMud2F0Y2gobG9va3VwKVxyXG59XHJcbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciB1bmRlZmluZWQ7XG5cbnZhciBpc1BsYWluT2JqZWN0ID0gZnVuY3Rpb24gaXNQbGFpbk9iamVjdChvYmopIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScgfHwgb2JqLm5vZGVUeXBlIHx8IG9iai5zZXRJbnRlcnZhbCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBoYXNfb3duX2NvbnN0cnVjdG9yID0gaGFzT3duLmNhbGwob2JqLCAnY29uc3RydWN0b3InKTtcblx0dmFyIGhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QgPSBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSAmJiBoYXNPd24uY2FsbChvYmouY29uc3RydWN0b3IucHJvdG90eXBlLCAnaXNQcm90b3R5cGVPZicpO1xuXHQvLyBOb3Qgb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5IG11c3QgYmUgT2JqZWN0XG5cdGlmIChvYmouY29uc3RydWN0b3IgJiYgIWhhc19vd25fY29uc3RydWN0b3IgJiYgIWhhc19pc19wcm9wZXJ0eV9vZl9tZXRob2QpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBPd24gcHJvcGVydGllcyBhcmUgZW51bWVyYXRlZCBmaXJzdGx5LCBzbyB0byBzcGVlZCB1cCxcblx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cdHZhciBrZXk7XG5cdGZvciAoa2V5IGluIG9iaikge31cblxuXHRyZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgfHwgaGFzT3duLmNhbGwob2JqLCBrZXkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmUsXG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuXHRcdGkgPSAxLFxuXHRcdGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdFx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKHR5cGVvZiB0YXJnZXQgPT09IFwiYm9vbGVhblwiKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiB0YXJnZXQgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHRhcmdldCAhPT0gXCJmdW5jdGlvblwiIHx8IHRhcmdldCA9PSB1bmRlZmluZWQpIHtcblx0XHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAoKG9wdGlvbnMgPSBhcmd1bWVudHNbaV0pICE9IG51bGwpIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAobmFtZSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFtuYW1lXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbbmFtZV07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAodGFyZ2V0ID09PSBjb3B5KSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKGRlZXAgJiYgY29weSAmJiAoaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvcHkpKSkpIHtcblx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gZXh0ZW5kKGRlZXAsIGNsb25lLCBjb3B5KTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29weSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iXX0=
