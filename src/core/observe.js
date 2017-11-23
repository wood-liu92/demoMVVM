/**
 * 
 * @param {*} data 
 */
function observe (value) {
  if (!value || typeof value !== 'object') {
    return;
  }
  return new Observer(value);

}
/**
 * @class 发布类 Observer that are attached to each observed
 * @param {[type]} value [vm参数]
 */
function Observer (value) {
  this.value = value;
  this.walk(value);
}
Observer.prototype = {
  walk: function (obj) {
    let self = this;
    Object.keys(obj).forEach(key => {
      self.observeProperty(obj, key, obj[key])
    })
  },
  observeProperty: function (obj, key, val) {
    let self = this;
    self.dep = new Dep();
    let childOb = observe(val);
    Object.defineProperty(obj, key, {
      enumerable: true, // 可枚举
      configurable: true, // 可重新定义
      get: function() {
        if (Dep.target) {
          self.dep.depend();
        }
        if (childOb) {
          childOb.dep.depend();
        }
        return val;
      },
      set: function(newVal) {
        if (val === newVal || (newVal !== newVal && val !== val)) {
          return;
        }
        val = newVal;
        // 监听子属性
        childOb = observe(newVal);
        // 通知数据变更
        self.dep.notify();
      }
    })
  }
}
/**
 * @class 依赖类 Dep
 */
let uid = 0;
function Dep () {
  // dep id
  this.id = uid++;
  this.subs = [];
}
Dep.target = null;
Dep.prototype = {
  // 添加订阅者
  addSub: function (sub) {
    this.subs.push(sub)
  },
  removeSub: function (sub) {
    let index = this.subs.indexOf(sub);
    if(index !== -1) {
      this.subs.splice(index, 1);
    }
  },
  // 通知数据变更
  notify: function () {
    this.subs.forEach( sub => {
      sub.update();
    });
  },
  // add Watcher
  depend: function () {
    Dep.target.addDep(this);
  }
}
