import { dispatch } from '../_handler.mjs'
export default (request, response) => dispatch('auth/status', request, response)
