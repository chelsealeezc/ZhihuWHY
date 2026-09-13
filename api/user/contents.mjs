import { dispatch } from '../_handler.mjs'
export default (request, response) => dispatch('user/contents', request, response)
