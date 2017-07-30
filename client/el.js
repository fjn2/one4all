class El {
  constructor (element) {
    if (typeof element === 'string') {
      element = document.querySelector(element)
    }

    this.$el = element
  }

  get () {
    return this.$el
  }

  show () {
    this.$el.style.display = 'block'
    return this
  }

  showInline () {
    this.$el.style.display = 'inline'
    return this
  }

  hide () {
    this.$el.style.display = 'none'
    return this
  }

  disable () {
    this.$el.disabled = true
    return this
  }

  enable () {
    this.$el.disabled = false
    return this
  }

  style (styleName, value) {
    this.$el.style[styleName] = value
    return this
  }

  addClass (className) {
    this.$el.className += ` ${className}`
    return this
  }

  removeClass (className) {
    this.$el.className = this.$el.className
      .replace(className, '')
      .replace('  ', ' ')

    return this
  }

  setRandomBackground ({path = '', range = [0, 5], length = 3, ext = 'jpg'}) {
    const [min, max] = range
    const num = Math.round(Math.random() * (max - min) + min)
    const name = ('0'.repeat(length) + num).substr(-length)
    this.$el.style.backgroundImage = `url(${path}/${name}.${ext})`
  }

  appear () {
    this.style('opacity', 1)
    return this
  }

  focus () {
    this.$el.focus()
    return this
  }

  html (value) {
    if (value === undefined) return this.$el.innerHTML;
    
    this.$el.innerHTML = value
    return this
  }

  appendHtml (value) {
    this.$el.innerHTML += value
    return this
  }

  prependHtml (value) {
    this.$el.innerHTML = value + this.html()
    return this
  }

  val (value) {
    if (value === undefined) return this.$el.value
    this.$el.value = value
    return this
  }

  clear () {
    this.$el.value = ''
    return this
  }

  isVisible () {
    if (this.$el.style.display === '') return true
    return (this.$el.style.display.match(/(block|inline|inline-block)/))
  }

  toggle () {
    if (this.isVisible()) {
      this.hide()
      return this
    }

    this.show()
    return this
  }

  caretEnd () {
    this.$el.focus();
    if (
      typeof window.getSelection != "undefined" &&
      typeof document.createRange != "undefined"
    ) {
        var range = document.createRange();
        range.selectNodeContents(this.$el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(this.$el);
        textRange.collapse(false);
        textRange.select();
    }

    return this
  }

  src (value) {
    this.$el.src = value
    return this
  }

  scrollBottom () {
    this.$el.scrollTop = this.$el.scrollHeight
    return this
  }

  on (event, callback) {
    this.$el.addEventListener(event, callback)
    return this
  }

  static injectStyles (styles){
    const style = document.createElement('style')
    style.type = 'text/css'
    style.innerHTML = styles

    document.getElementsByTagName('head')[0].appendChild(style)
  }
}
