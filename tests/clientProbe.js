import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk?version=4.0';
import GdkPixbuf from 'gi://GdkPixbuf';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {parseXcursor} from './arrowIdentity.js';
const control=ARGV[0];
const app=new Gtk.Application({application_id:'io.github.dynphys.IsolatedProbe'});
app.connect('activate',()=>{
 const window=new Gtk.ApplicationWindow({application:app,title:'DynPhys Client Probe',default_width:600,default_height:400});
 window.set_child(new Gtk.Label({label:'Isolated client-supplied cursor test'}));
 const cursors={};
 for(const name of ['default','text','pointer','ew-resize']) {
  const [,bytes]=Gio.File.new_for_path(`/usr/share/icons/Yaru/cursors/${name}`).load_contents(null);
  const frames=parseXcursor(bytes); const frame=frames.find(f=>f.width===24)??frames[0];
  const pixels=frame.pixels.slice();
  for(let i=0;i<pixels.length;i+=4) for(let c=0;c<3;c++)
   pixels[i+c]=pixels[i+3]?Math.min(255,Math.round(pixels[i+c]*255/pixels[i+3])):0;
  const pixbuf=GdkPixbuf.Pixbuf.new_from_bytes(GLib.Bytes.new(pixels),GdkPixbuf.Colorspace.RGB,true,8,frame.width,frame.height,frame.width*4);
  cursors[name]=Gdk.Cursor.new_from_texture(Gdk.Texture.new_for_pixbuf(pixbuf),frame.hotX,frame.hotY,null);
 }
 let previous='';
 GLib.timeout_add(GLib.PRIORITY_DEFAULT,100,()=>{
  try { const [,bytes]=GLib.file_get_contents(control); const command=new TextDecoder().decode(bytes).trim();
   if(command!==previous&&cursors[command]) {window.set_cursor(cursors[command]);previous=command;}
  } catch (_) {}
  return GLib.SOURCE_CONTINUE;
 });
 window.present();
});
app.run([]);
