
/**
 * @class 指令类解析Compile
 * @param {Object} el [element节点] 
 * @param {Object} vm  [MVVM实例]
 */
function Compile (el, vm) {
  this.$vm = vm;
  this.$el = this.isElementNode(el) ? el :document.querySelector(el);
  if (this.$el) {
    this.$fragment = this.nodeFragment(this.$el);
    this.compileElement(this.$fragment);
    // 将文档碎片放回真实dom
    this.$el.appendChild(this.$fragment)
  }
}
Compile.prototype = {
  // 文档碎片，遍历过程中会有多次的dom操作，为提高性能我们会将el节点转化为fragment文档碎片进行解析操作
  // 解析操作完成，将其添加回真实dom节点中
  nodeFragment: function(el) {
    let fragment = document.createDocumentFragment();
    let child;
    while (child = el.firstChild) {
      fragment.appendChild(child);
    }
    return fragment;
  },
  compileElement: function (el) {
    let self = this;
    let childNodes = el.childNodes;
    [].slice.call(childNodes).forEach(node => {
      let text = node.textContent;
      let reg = /\{\{((?:.|\n)+?)\}\}/;
      if (self.isElementNode(node)) {
        self.compile(node);
      }
      // 文本节点并且含有
      else if (self.isTextNode(node) && reg.test(text)) {
        /**
         * 执行reg.text(text)代码后
         * 会将正则匹配的内容挂载到RegExp.$n下面
         */
        // 匹配第一个选项
        self.compileText(node, RegExp.$1.trim());
      }
      // 含有子节点递归
      if (node.childNodes && node.childNodes.length) {
        self.compileElement(node)
      }
      
    });
  },
  /**
   * @param {*} node 元素
   */
  compile: function(node) {
    let nodeAttrs = node.attributes;
    let self = this;

    [].slice.call(nodeAttrs).forEach(attr => {
      var attrName = attr.name;
      if (self.isDirective(attrName)) {
        // 属性节点的属性值
        var exp = attr.value; 
        var dir = attrName.substring(2);
        // 是否是事件指令
        if (self.isEventDirective(dir)) {
          compileUtil.eventHandler(node, self.$vm, exp, dir);
        } else {
          // 普通指令
          compileUtil[dir] && compileUtil[dir](node, self.$vm, exp);
        }
        // 移除指令名字
        node.removeAttribute(attrName);
      }
    })
  },
  // {{ test }} 匹配变量 test
  compileText: function (node, exp) {
    compileUtil.text(node, this.$vm, exp);
  },
  // 是否元素
  isElementNode: function (node) {
    return node.nodeType === 1;
  },
  // 文本节点
  isTextNode: function (node) {
    return node.nodeType === 3;
  },
  // 是否是指令
  isDirective: function (attr) {
    return attr.indexOf('x-') === 0; 
  },
  // 事件指令
  isEventDirective: function (dir) {
    return dir.indexOf('on') === 0;
  }
}
// 定义$elm，缓存当前执行input事件的input dom对象
let $elm;
let timer = null;
const compileUtil = {
  html: function (node, vm, exp) {
    this.bind(node, vm, exp, 'html');
  },
  text: function (node, vm, exp) {
    this.bind(node, vm, exp, 'text');
  },
  class: function (node, vm, exp) {
    this.bind(node, vm, exp, 'class');
  },
  model: function (node, vm, exp) {
    this.bind(node, vm, exp, 'model');
    let self = this;
    let val = this._getVmVal(vm, exp);
    // 监听input事件
    node.addEventListener('input', function (e) {
      let newVal = e.target.value;
      $elm = e.target;
      // 如果v-model 和 input 的value值相等不用进行处理
      if (val === newVal) {
        return
      }
      // 异步完成v-model的ui更新
      clearTimeout(timer);
      timer = setTimeout(function () {
        self._setVmVal(vm, exp, newVal);
        val = newVal;
      });
    });
  },
  bind: function (node, vm, exp, dir) {
    let updaterFn = updater[dir + 'Updater'];
    // 更新对应的视图
    updaterFn && updaterFn(node, this._getVmVal(vm, exp));
    new Watcher(vm, exp, function(value, oldValue) {
      updaterFn && updaterFn(node, value, oldValue);
    });
  },
  eventHandler: function (node, vm, exp, dir) {
    let eventType = dir.split(':')[1];
    let fn = vm.$options.methods && vm.$options.methods[exp];

    if (eventType && fn) {
      node.addEventListener(eventType, fn.bind(vm), false)
    }
  },
  /**
   * [获取挂载在vm实例上的value]
   * @param {Object} vm mvvm实例
   * @param {exp} exp expression 模板 {{}}里的变量
   * @return {{}}里变量对应值
   */
  _getVmVal: function (vm, exp) {
    let val = vm;
    exp = exp.split('.');
    exp.forEach(key => {
      key.trim();
      val = val[key];
    })
    return val;
  },
    /**
   * [设置挂载在vm实例上的value值]
   * @param  {[type]} vm    [mvvm实例]
   * @param  {[type]} exp   [expression]
   * @param  {[type]} value [新值]
   */
  _setVmVal: function(vm, exp, value) {
    let val = vm;
    exps = exp.split('.');
    exps.forEach((key, index) => {
      key = key.trim();
      if (index < exps.length - 1) {
        val = val[key];
      } else {
        val[key] = value;
      }
    });
  }
}
// 指令渲染集合
const updater = {
  htmlUpdater: function (node, value) {
    node.innerHTML = typeof value === 'undefined' ? '' : value;
  },
  textUpdater: function (node, value) {
    node.textContent = typeof value === 'undefined' ? '' : value;
  },
  classUpdater: function () {},
  modelUpdater: function (node, value, oldValue) {
    // 不对当前操作input进行渲染操作
    if ($elm === node) {
      return false;
    }
    $elm = undefined;
    node.value = typeof value === 'undefined' ? '' : value;
  }
}