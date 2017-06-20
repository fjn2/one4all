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

  hide () {
    this.$el.style.display = 'none'
    return this
  }

  style (styleName, value) {
    this.$el.style[styleName] = value
    return this
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
    this.$el.innerHTML = value
    return this
  }

  val (value) {
    if (value === undefined) return this.$el.value
    this.$el.value = value
    return this
  }
}
