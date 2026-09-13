import { dispatch } from '../_handler.mjs'
export default (request, response) => dispatch('discussions/analyze', request, response)
