import { Done } from '../../../../Class/Functional/Done'
import { Semifunctional } from '../../../../Class/Semifunctional'
import { System } from '../../../../system'
import { ID_N_ARRAY_BUILDER } from '../../../_ids'

export type I<T> = {
  a: T
  n: number
}

export type O<T> = {
  'a[]': T[]
  test?: boolean
  acc?: T[]
}

export default class NArrayBuilder<T> extends Semifunctional<I<T>, O<T>> {
  private _n: number
  private _array: T[]

  constructor(system: System) {
    super(
      {
        fi: ['n'],
        fo: ['a[]', 'test', 'acc'],
        i: ['a'],
        o: [],
      },
      {},
      system,
      ID_N_ARRAY_BUILDER
    )

    this.addListener('reset', () => {
      this._n = undefined
      this._array = []
    })
  }

  f({ n }: I<T>, done: Done<O<T>>) {
    if (n < 0) {
      done(undefined, 'n cannot be negative')

      return
    }

    this._n = n
    this._array = []
    this._emitProgress()

    if (n === 0) {
      this._output['a[]'].push([])
      this._n = undefined

      return
    }

    if (this._i.a !== undefined) {
      this._loop(this._i.a)
    }
  }

  d() {
    this._n = undefined
    this._array = []
  }

  onIterDataInputData(name: string, data: any): void {
    // console.log('NArrayBuilder', name, data)

    // if (name === 'a') {
    const a = data as T
    if (this._n !== undefined) {
      this._loop(a)
    }
    // }
  }

  private _emitProgress(): void {
    const acc = [...this._array]
    const test = this._n !== undefined && acc.length < this._n

    this._output.acc.push(acc)
    this._output.test.push(test)
  }

  private _loop(a: T) {
    this._array.push(a)
    this._emitProgress()

    if (this._array.length === this._n) {
      this._output['a[]'].push([...this._array])
      this._n = undefined
      this._array = []
    }
    this._input.a.pull()
  }
}
