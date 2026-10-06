import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Cogl from 'gi://Cogl';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {readCursorPixels} from './cursorReader.js';
import {loadThemeArrows} from './cursorTheme.js';
import {parseXcursor, matchesArrow} from './arrowIdentity.js';
const wait = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms,
    () => {resolve(); return GLib.SOURCE_REMOVE;}));
const assert = (ok, message) => { if (!ok) throw new Error(message); };
export async function probe(extension) {
  try {
    console.log('DYNPHYS-PROBE begin');
    await wait(1500);
    const context=global.stage.get_context().get_backend().get_cogl_context();
    for(const theme of ['Adwaita','Yaru']) {
      const refs=loadThemeArrows(theme);
      assert(refs.length>0, `missing ${theme} refs`);
      const frame=refs[0];
      const texture=Cogl.Texture2D.new_from_data(context,frame.width,frame.height,
        Cogl.PixelFormat.RGBA_8888_PRE,frame.width*4,frame.pixels);
      const sample=await readCursorPixels(texture,frame.hotX,frame.hotY);
      assert(matchesArrow(refs,sample),`${theme} actual GPU readback rejected`);
      console.log(`DYNPHYS-PROBE ${theme} GPU roundtrip PASS`);
    }
    extension._settings.set_boolean('pause-overview',false);
    const actor=new Clutter.Actor({name:"DynPhys-Probe-Target",reactive:true,x:100,y:100,width:800,height:500});
    actor.set_cursor_type(Clutter.CursorType.DEFAULT);
    global.stage.add_child(actor);
    const seat=global.stage.get_context().get_backend().get_default_seat();
    const device=seat.create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
    device.notify_absolute_motion(GLib.get_monotonic_time(),200,200);
    await wait(1500);
    console.log(`DYNPHYS-PROBE arrow held=${extension._lease.held}, refs=${extension._arrows.length}, candidate=${!!extension._candidate}, approved=${!!extension._arrowApproval.approved}`);
    assert(extension._lease.held,'arrow was not replaced');
    for(const [name,type] of [['text',Clutter.CursorType.TEXT],['hand',Clutter.CursorType.POINTER],['resize',Clutter.CursorType.EW_RESIZE]]) {
      actor.set_cursor_type(type);
      device.notify_absolute_motion(GLib.get_monotonic_time(),210,210);
      await wait(500);
      console.log(`DYNPHYS-PROBE ${name} held=${extension._lease.held} picked=${global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE,210,210)?.name} candidateHot=${extension._candidate?.hotX},${extension._candidate?.hotY}`);
      assert(!extension._lease.held,`${name} still replaced`);
      assert(!extension._actor.visible,`${name} overlay still visible`);
      assert(extension._tracker.get_pointer_visible(),`${name} native pointer hidden`);
      console.log(`DYNPHYS-PROBE ${name} native PASS`);
    }
    actor.set_cursor_type(Clutter.CursorType.DEFAULT);
    device.notify_absolute_motion(GLib.get_monotonic_time(),220,220);
    await wait(500);
    assert(extension._lease.held,'arrow did not resume');
    actor.destroy();
    Main.overview.hide();
    const control=`${extension.path}/client-control`;
    GLib.file_set_contents(control,'default');
    const launcher=new Gio.SubprocessLauncher({flags:Gio.SubprocessFlags.NONE});
    launcher.setenv('GDK_BACKEND','wayland',true);
    launcher.setenv('WAYLAND_DISPLAY','wayland-dynphys-test',true);
    launcher.setenv('GTK_USE_PORTAL','0',true);
    const process=launcher.spawnv(['gjs','-m',`${extension.path}/clientProbe.js`,control]);
    await wait(5000);
    const window=global.get_window_actors().map(a=>a.meta_window).find(w=>w.title==='DynPhys Client Probe');
    assert(window,'client window missing');
    window.move_resize_frame(false,100,100,600,400);
    window.activate(global.get_current_time());
    device.notify_absolute_motion(GLib.get_monotonic_time(),300,300);
    await wait(1000);
    assert(extension._lease.held,'client arrow was not recognized');
    console.log('DYNPHYS-PROBE client arrow PASS');
    for(const name of ['text','pointer','ew-resize']) {
      GLib.file_set_contents(control,name);
      await wait(500);
      assert(!extension._lease.held,`client ${name} still replaced`);
      assert(!extension._actor.visible,`client ${name} overlay visible`);
      assert(extension._tracker.get_pointer_visible(),`client ${name} hidden`);
      console.log(`DYNPHYS-PROBE client ${name} native PASS`);
    }
    GLib.file_set_contents(control,'default');
    await wait(500);
    assert(extension._lease.held,'client arrow did not resume');
    process.force_exit();
    const tracker=extension._tracker;
    extension.disable();
    assert(tracker.get_pointer_visible(),'disable left native cursor hidden');
    console.log('DYNPHYS-PROBE ALL PASS');
  } catch(error) { console.error(`DYNPHYS-PROBE FAILED ${error.message} ${error.stack}`); }
}
