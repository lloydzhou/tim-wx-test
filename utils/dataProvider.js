
/**
 * @author lloydzhou@qq.com
 * 使用统一的DataProvider对象来获取数据，以及做分页处理等操作
 * 专门针对移动端分页的时候，使用下拉等操作处理数据
 * data存储使用page作为数组id，避免直接使用concat操作结果，可能带来页码数据混乱
 * 外部获取数据使用getData接口，这个接口会读取每一页数据最终合并起来返回
 */

class DataProvider{
  constructor(service, result='data', size=20) {
    this.service = service
    this.result = result
    this.size = size
    this.reset()
    this.params = []
    this.fetchFirstPage = this.fetchFirstPage.bind(this)
    this.fetchNextPage = this.fetchNextPage.bind(this)
  }

  setParams(...params) {
    this.params = params
  }

  reset() {
    this.data = [];
    this.count = 0
    this.page = 0
    this.total = 0;  // 初始化的时候是-1，后面请求之后就变成了实际的数量
    this.hasMore = true
    this.loading = false
  }

  fetchFirstPage() {
    this.reset()
    return this.fetchData()
  }

  fetchNextPage() {
    return this.fetchData()
  }
  fetchData() {
    return new Promise((resolve, reject) => {
      if (this.loading) {
        resolve({loading: true})
      }
      if (!this.hasMore) {
        resolve({hasMore: false})
      }
      this.loading = true
      const page = this.page + 1
      const params = [...this.params, page, this.size]
      const res = this.service.apply(null, params).then(res => {
        if (res.code == 0) {
          const data = [...(res[this.result] || [])]
          this.data[page] = data
          this.page = page
          this.count += this.size
          this.total = res.total
          this.hasMore = res.total > this.count
          resolve({
            data: this.getData(),
            total: this.getTotal(),
            page: this.getCurrentPage(),
            size: this.size,
            hasMore: this.hasMore,
            res: res,
          })
        } else {
          console.error(res)
          resolve({ err: Error(res.msg) })

        }
        this.loading = false
      }).catch(e =>{
        console.error(e)
        this.loading = false
        resolve({ err: e })
      })
    })
  }

  getTotal() {
    return this.total
  }

  getData() {
    const res = []
    for (let page = 1; page <= this.page; page++) {
      if (this.data[page] && this.data[page].length) {
        res.splice(res.length, 0, ...this.data[page])
      }
    }
    //return res.concat(res).concat(res).concat(res)
    return res
  }

  refreshItem(itemIdentifyName, itemIdentifyValue, newItem) {
    for(let page = 1; page <= this.page; page++) {
      const flag = this.data[page].findIndex( i => {
        return i[itemIdentifyName] == itemIdentifyValue
      })
      if(flag > -1) {
        this.data[page][flag] = newItem
      }
    }
    return this.getData()
  }
  deleteItem(itemIdentifyKeys, itemIdentifyValue) {
    for (let page = 1; page <= this.page; page++) {
      const flag = this.data[page].findIndex(i => {
        let value = i
        itemIdentifyKeys.map(k => {
          value = value[k]
        })
        return value == itemIdentifyValue
      })
      if (flag > -1) {
        this.data[page].splice(flag, 1)
      }
    }
    return this.getData()
  }
  addItem(newItem, site){
    switch(site) {
      case 'first':
        this.data[1].unshift(newItem)
        break;
      case 'last':
        this.data[this.page].push(newItem)
        break;
      default: break;
    }
    return this.getData()
  }

  getCurrentPage() {
    return this.page
  }

  getPageSize() {
    return this.size
  }

  getIsLoading() {
    return this.loading
  }

}

export default DataProvider;

