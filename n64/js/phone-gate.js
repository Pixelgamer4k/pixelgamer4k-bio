/**
 * Phone-only play gate for Pixel Gamer 4k.
 * Allows iPhone/iPod and Android phones. Blocks desktop, tablet, TV, consoles.
 */
(function (root) {
  'use strict';

  function isPhonePlayDevice() {
    const ua = navigator.userAgent || navigator.vendor || '';
    const maxTouch = navigator.maxTouchPoints || 0;
    const vw = window.innerWidth || 0;
    const vh = window.innerHeight || 0;
    const sw = (screen && screen.width) || vw;
    const sh = (screen && screen.height) || vh;
    const minSide = Math.min(vw, vh, sw, sh);
    const maxSide = Math.max(vw, vh, sw, sh);

    if (
      /AppleTV|GoogleTV|SmartTV|HbbTV|NetCast|BRAVIA|CrKey|PlayStation|Xbox/i.test(ua) ||
      /Nintendo/i.test(ua) ||
      /TV Safari/i.test(ua)
    ) {
      return false;
    }

    // iPad, including iPadOS 13+ desktop UA
    if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouch > 1)) {
      return false;
    }

    // Android tablet / large-device UA (no "Mobile")
    if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
      return false;
    }

    const isiPhone = /iPhone|iPod/i.test(ua);
    const isAndroidPhone = /Android/i.test(ua) && /Mobile/i.test(ua);
    if (!isiPhone && !isAndroidPhone) {
      return false;
    }

    // Tablet / desktop-sized viewports (phone landscape still fits: min side ~390–430)
    if (minSide >= 600 && maxSide >= 1024) {
      return false;
    }

    return true;
  }

  root.isPhonePlayDevice = isPhonePlayDevice;
})(window);
