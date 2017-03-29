/* @flow */
/** 包含DOM 的操作方法 */
import { namespaceMap } from 'web/util/index'
// 创建DOM元素
export function createElement (tagName: string, vnode: VNode): Element {
  const elm = document.createElement(tagName)
  if (tagName !== 'select') {
    return elm
  }
  // false or null will remove the attribute but undefined will not
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    elm.setAttribute('multiple', 'multiple')
  }
  return elm
}
// 创建一个 带有命名空间的DOM元素
export function createElementNS (namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName)
}
// 创建一个文字节点
export function createTextNode (text: string): Text {
  return document.createTextNode(text)
}
// 创建一个注释节点
export function createComment (text: string): Comment {
  return document.createComment(text)
}
// 将 newNode 插入到 referenceNode 前
export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}
//  移除某个子元素
export function removeChild (node: Node, child: Node) {
  node.removeChild(child)
}
// 将子节点插入到父节点中
export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}
// 返回元素的父节点
export function parentNode (node: Node): ?Node {
  return node.parentNode
}
// 获取节点的下个兄弟节点
export function nextSibling (node: Node): ?Node {
  return node.nextSibling
}
// 返回节点名称
export function tagName (node: Element): string {
  return node.tagName
}
// 设置节点的文字
export function setTextContent (node: Node, text: string) {
  node.textContent = text
}
// 设置节点属性
export function setAttribute (node: Element, key: string, val: string) {
  node.setAttribute(key, val)
}
