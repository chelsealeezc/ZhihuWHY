import { dispatch } from '../_handler.mjs'
export default (request, response) => dispatch('zhihu/search', request, response)
