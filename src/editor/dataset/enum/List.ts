export enum ListType {
  UL = 'ul',
  OL = 'ol'
}

export enum UlStyle {
  DISC = 'disc', // 实心圆点
  CIRCLE = 'circle', // 空心圆点
  SQUARE = 'square', // 实心方块
  DASH = 'dash', // 破折号/横线
  CHECKBOX = 'checkbox' // 复选框
}

export enum OlStyle {
  DECIMAL = 'decimal' // 阿拉伯数字
}

export enum ListStyle {
  DISC = UlStyle.DISC,
  CIRCLE = UlStyle.CIRCLE,
  SQUARE = UlStyle.SQUARE,
  DECIMAL = OlStyle.DECIMAL,
  CHECKBOX = UlStyle.CHECKBOX,
  DASH = UlStyle.DASH
}
