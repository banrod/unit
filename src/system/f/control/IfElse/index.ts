import { Functional } from '../../../../Class/Functional'
import { System } from '../../../../system'
import { ID_IF_ELSE } from '../../../_ids'

export interface I<T> {
  a: T
  b: boolean
}

export interface O<T> {
  if: T
  else: T
}

export default class IfElse<T> extends Functional<I<T>, O<T>> {
  constructor(system: System) {
    super({ i: ['a', 'b'], o: ['if', 'else'] }, {}, system, ID_IF_ELSE)
  }

  f({ a, b }: I<T>, done): void {
    if (b === true) {
      done({ if: a, else: undefined })
    } else {
      done({ if: undefined, else: a })
    }
  }
}
