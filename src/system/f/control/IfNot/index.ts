import { Functional } from '../../../../Class/Functional'
import { System } from '../../../../system'
import { ID_IF_NOT } from '../../../_ids'

export interface I<T> {
  a: T
  b: boolean
}

export interface O<T> {
  'a if not b': T
}

/**
 * Routes `a` when `b` is falsy; otherwise yields no output.
 */
export default class IfNot<T> extends Functional<I<T>, O<T>> {
  constructor(system: System) {
    super(
      {
        i: ['a', 'b'],
        o: ['a if not b'],
      },
      {},
      system,
      ID_IF_NOT
    )
  }

  f({ a, b }: I<T>, done): void {
    if (b === false) {
      done({ 'a if not b': a })
    } else {
      done({ 'a if not b': undefined })
    }
  }
}
