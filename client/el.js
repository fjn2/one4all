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
    if (!value) return this.$el.innerHTML;
    
    this.$el.innerHTML = value
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
}
