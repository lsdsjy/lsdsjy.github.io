---
title: Ref Element of Component in Vue.js
date: 2022-11-05 15:10:03
tags:
---

# The Problem

In Vue.js we use `ref` to get the real DOM element of a node, like:

```jsx
const dom = ref()
// Output: a <div> element
watch(dom, (v) => console.log(v))

<div ref="dom"></div>
```

However when the `ref`ed node is a custom component, [we’ll get the component instance instead](https://vuejs.org/guide/essentials/template-refs.html#ref-on-component):

```jsx
const dom = ref()
// Output: a component instance
watch(dom, (v) => console.log(v))

<Comp ref="dom"></Comp>
```

And we can use the [`$el`](https://vuejs.org/api/component-instance.html#el) property of the instance to get the underlying DOM element:

```jsx
const dom = ref()
// Output: the root element of the component
watch(dom, (v) => console.log(v.$el))

<Comp ref="dom"></Comp>
```

So far so good, unless your component has a `v-if` directive on the root:

```jsx
// Comp.vue
<template>
	<div v-if="flag">...</div>
</template>
```

If `flag` is not truthy when the component is mounted, we will get a comment node by accessing the `$el` property:

```jsx
// Output: a comment node like <!-- -->
watch(dom, (v) => console.log(v.$el))
```

Of course when `flag` turns truthy the `$el` property will be the rendered `<div>` element. It’s all reasonable, except that **the `$el` property of a component instance is not reactive** and it won’t trigger any `watch` or `computed` expressions!

So if you want to attach event listeners to the root element of a component (I know it sounds like bad-smell code but sometimes you have to do that) using pre-defined composables like [`useEventListener`](https://vueuse.org/core/useeventlistener/#useeventlistener), it may not work because it uses `watch` under the hood. Basically we have no idea on the parent side when will the root element (with a `v-if`) of a child component be rendered, unless you manually `watch` the flag and emit a event from the child component.

# The Solution

The solution is using [custom directives](https://vuejs.org/guide/reusability/custom-directives.html#directive-hooks). As mentioned in the doc, custom directive hooks will be passed the element the directive is bound to as an argument. And in fact, the directive hooks will only be triggered when there is a real HTML element, i.e. when the root element is actually rendered. So we can write a custom directive like this:

```jsx
// binding.value should be a ref
export const vRefElement = (el, binding) => {
  binding.value.value = el;
};
```

And use it like:

```jsx
const dom = ref()
<Comp v-ref-element="dom" />
```

Oops! An error:

```
Uncaught (in promise) TypeError: Cannot set properties of undefined (setting 'value')
```

The problem here is that [Vue unwraps refs in template](https://vuejs.org/guide/essentials/reactivity-fundamentals.html#ref-unwrapping-in-templates) so the directive receives not the `dom` ref itself but its inside value, which is `undefined`! So to avoid this kind of unwrapping, we can wrap it in a plain object:

```jsx
const dom = ref()
const domWrap = { dom }
// Output(after flag becomes truthy): <div>
watch(dom, (v) => console.log(v))
<Comp v-ref-element="domWrap.dom" />
```

Now it works! The `dom` ref will be filled with a `<div>` when `flag` becomes truthy and will trigger all relevant reactive computations.

See a demo here:

[https://stackblitz.com/edit/vitejs-vite-3sqrri?file=src/App.vue](https://stackblitz.com/edit/vitejs-vite-3sqrri?file=src/App.vue)
