import { ImageFilterStore } from './ImageFilter'

const store = new ImageFilterStore()

for (let i = 0; i < 100000; i++) {
  store.addImage({
    id: `img-${i}`,
    tags: i % 2 === 0 ? ['even'] : ['odd'],
    root: i % 10 === 0 ? 'rootA' : 'rootB',
    path: `/images/${i}.png`,
  })
}

const result = store.filter(['even'], 'rootA')
console.log(`found ${result.length} images`)
