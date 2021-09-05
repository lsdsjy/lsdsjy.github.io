---
title: 为什么我们需要 __esModule
author: lsdsjy
date: 2021-09-05 23:22:11
tags:
---

ES Modules（ESM）是 ES2015 规范中定义的 JavaScript 模块格式，而早在此之前社区就已经探索出了诸如 CommonJS 和 AMD 之类的模块格式，其中影响力最大的就是被 Node.js 采用的 CommonJS。在 ESM 规范出现之前，JS 社区里的三方包几乎全部采用 CJS 模块格式编写，所以当 ESM 出现时，社区必须考虑的一个问题就是 ES Modules 如何与 CommonJS Modules 互操作（interoperate）。

<!-- more -->

## ESM 如何使用 CJS 模块

一个比较直觉的想法是把 CJS 中的 `const a = require('a')` 和 ESM 的 namespace import 即 `import * as a from 'a'` 对应起来，因为这两者表达的语义都是“引用某模块导出的所有东西”。

但是我们知道 CommonJS 中模块导出的可以是任意数据，包括对象、函数和原生类型（数字、字符串等），而 ESM 的 namespace import 得到的 namespace object 只能是一个普通的对象，这就造成了失配，比如对于 jquery 库：

```js
const $ = require('jquery')
$('body') // OK

import * as $ from 'jquery'
$('body') // Error, $ is not a function
```

所以我们只能将 CJS 模块的 `exports` 对象映射到 ESM 的 `default` 即默认导出，如：

```js
// a.js
module.exports = 1

// b.js
import a from './a.js'
```

但是这也就导致named exports失去了用处。比如我们只能这么写：

```js
import fs from 'fs'
fs.default.readFile()
```

对开发者而言，更理想的写法还是：

```js
import * as fs from 'fs'
fs.readFile()
```

为了在保证语义正确的前提下允许这种写法，各个工具都会把 CJS 中 `exports` 对象的每个属性对应为一个 ESM named export，比如 tslib 中的 `__importStar`：

```js
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
```

Node.js 也会通过静态分析的方式创建一些 named export（[https://nodejs.org/api/esm.html#esm_import_statements](https://nodejs.org/api/esm.html#esm_import_statements)）。

注意一些工具比如 Babel、TypeScript 在早期曾经使用了如前所述的错误的映射关系，导致后续需要引入[专门的编译器开关](https://www.typescriptlang.org/tsconfig#esModuleInterop)来矫正这种行为。

## CJS 如何使用 ESM 模块

ESM 模块有默认导出（default export）和具名导出（named export），而 CJS 只有一个 `exports` 对象，所以自然地需要把默认导出和具名导出合并为一个对象（namespace）并映射到 `exports`：

```js
// a.js
export default 1
export const v = 2

// b.js
const a = require('./a.js')
console.log(a.default, a.v) // 1 2
```

## 转译x2

考虑如下模块：

```js
// a.js
export default 1

// b.js
import a from './a.js'
a + 1 // 2
```

按照前文定下的规则，这两个 ESM 会被转译为：

```js
// a.js
module.exports = { default: 1 }

// b.js
const a = require('./a.js')
a + 1 // Error
```

意外地，我们发现根据前面定下的映射规则进行转译会导致出错。对于 b.js 而言，如果它依赖的 a.js 是个 CJS 模块就没有任何问题：

```js
// a.js
module.exports = 1

// transpiled b.js
const a = require('./a.js')
a + 1 // 2
```

所以，之前我们制定的互操作规则考虑了 ESM→CJS 和 CJS→ESM 的场景（箭头表示依赖），但没法覆盖(ESM to CJS)→(ESM to CJS) 的场景，因为本质上这两种模块格式没法完美地对应。

针对这种转译后再引用的场景，社区提出了以 `__esModule` 属性作为标记的方案，即转译工具需要在将 ESM 转译为 CJS 时为模块导出对象设置 `__esModule` 属性：

```js
// a.js
export default 1

// transpiled a.js
module.exports = { default: 1 }
module.exports.__esModule = true
```

所以如果一个 CJS 模块的导出对象的 `__esModule` 属性为 `true`，说明该模块是由 ESM 转译而来；而此时如果消费者也是 ESM，则 `import a from './a.js'` 这样的默认导入会被转译为：

```js
const a = require('./a.js').default
```

实际上这一步判断不是在转译时进行的，因为转译工具在转译时并不一定知道被依赖模块的内容。所以生成的代码其实类似这样：

```js
let a = require('./a.js')
if (!a|| !a.__esModule)
  a = { default: es6Module }
a = a.default
```

## 总结

这篇文章虽然叫“为什么我们需要 __esModule”，但其实花了大量的篇幅阐述 ESM 和 CJS 之间的 interop，因为我在查资料的过程中发现这是讲清楚 `__esModule` 的前提。希望这篇文章讲得能比目前在 Google 上能搜到的同类文章更清晰一些。

## Ref

[https://github.com/esnext/es6-module-transpiler/issues/85](https://github.com/esnext/es6-module-transpiler/issues/85)

[https://github.com/esnext/es6-module-transpiler/issues/86](https://github.com/esnext/es6-module-transpiler/issues/86)

[https://github.com/google/traceur-compiler/pull/785](https://github.com/google/traceur-compiler/pull/785)

[https://github.com/babel/babel/issues/95](https://github.com/babel/babel/issues/95)

[https://nodejs.org/api/esm.html#esm_interoperability_with_commonjs](https://nodejs.org/api/esm.html#esm_interoperability_with_commonjs)