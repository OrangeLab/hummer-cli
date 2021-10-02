
/**
 * Regex for Vue sources. The input is something like `webpack:///foo.vue?asdf.
 * This pattern does not appear to be configurable in the Vue docs, so doing
 * ahead with 'hardcoding' it here.
 *
 * The first match group is the basename.
 *
 * @see https://cli.vuejs.org/config/#css-requiremoduleextension
 */
 const vueSourceUrlRe = /^webpack:\/{3}([^/]+?\.vue)(\?[0-9a-z]*)?$/i;

 /**
  * Regex for a vue generated file.
  */
 const vueGeneratedRe = /^webpack:\/{3}\.\/.+\.vue\?[0-9a-z]+$/i;
 
 export const enum VueHandling {
    /**
     * Not a Vue path, probably
     */
    Unhandled,
  
    /**
     * Lookup the base name on disk.
     */
    Lookup,
  
    /**
     * Omit it from disk mapping -- it's an unrelated generated file.
     */
    Omit,
  }
  

 export class VueFileMapper {

      /**
   * @inheritdoc
   */
  public static getVueHandling(sourceUrl: string) {

    return vueSourceUrlRe.test(sourceUrl)
      ? VueHandling.Lookup
      : vueGeneratedRe.test(sourceUrl)
      ? VueHandling.Omit
      : VueHandling.Unhandled;
  }
 } 