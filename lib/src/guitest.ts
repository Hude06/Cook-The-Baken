import {CanvasSurface} from "./canvas";
import {
    ActionButton,
    DialogContainer,
    DialogLayer,
    HBox,
    HSpacer,
    Label,
    LayerView,
    PopupContainer,
    PopupLayer,
    ScrollView,
    SelectList,
    VBox
} from "./components";
import {gen_id, Point, Size} from "./common";
import {BaseView, CommonEvent, ParentView, View} from "./core";

class FixedGridPanel extends BaseView {
    private sw: number;
    private sh: number;
    constructor(w: number, h: number) {
        super(gen_id("fixed-grid"))
        this.sw = w
        this.sh = h
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'#ccccff')
        g.ctx.strokeStyle = 'black'
        g.ctx.beginPath()
        for(let i=0; i<this.sw; i+=25) {
            g.ctx.moveTo(i,0)
            g.ctx.lineTo(i,this.sh)
        }
        for(let i=0; i<this.sh; i+=25) {
            g.ctx.moveTo(0,i)
            g.ctx.lineTo(this.sw,i)
        }
        g.ctx.stroke()
    }
    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(this.sw,this.sh))
        return this.size()
    }
}

class LCDView extends BaseView {
    constructor() {
        super("lcd-view");
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'#ccc')
        let text = 'LCD View'
        let size = g.measureText(text,'base')
        let x = (this.size().w - size.w)/2
        let y = (this.size().h - size.h)/2
        // g.fillRect(x,y,size.w,size.h,'aqua')
        g.fillStandardText(text,x,y+size.h,'base')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(200,60))
        return this.size()
    }
}

class DropdownButton extends ActionButton {
    private data: any[];
    private renderer: (v:any) => string;
    private selected_index: number;
    constructor(data: string[], selected:number, param2: (v:any) => string) {
        super(gen_id('dropdown'))
        this.data = data
        this.selected_index = selected
        this.renderer = param2
        this.caption = 'invalid'
        if(this.selected_index >= 0 && this.selected_index < this.data.length) {
            this.caption = this.renderer(this.data[this.selected_index])
        }
        this.on('action',(evt:CommonEvent)=>{
            let popup = new PopupContainer();
            let popup_box = new VBox()
            this.data.map(item => new ActionButton(this.renderer(item)))
                .forEach((btn,i) => {
                    btn.on('action',(evt2)=>{
                        let popup_layer = evt2.ctx.find_by_name('popup-layer') as PopupLayer
                        popup_layer.remove(popup)
                        this.selected_index = i
                        if(this.selected_index >= 0 && this.selected_index < this.data.length) {
                            this.caption = this.renderer(this.data[this.selected_index])
                        }
                    })
                    popup_box.add(btn)
                })
            popup.add(popup_box)
            let pt = evt.ctx.view_to_local(new Point(0,this.size().h),this)
            popup.set_position(pt)
            let popup_layer = evt.ctx.find_by_name('popup-layer') as LayerView
            popup_layer.add(popup)
        })
    }

}

function make_toolbar(surf:CanvasSurface) {
    let toolbar = new HBox()
    toolbar.fill = '#aaa'
    toolbar._name = 'toolbar'

    toolbar.add(new ActionButton("prev"))
    toolbar.add(new ActionButton("play"))
    toolbar.add(new ActionButton("next"))

    toolbar.add(new HSpacer())
    toolbar.add(new LCDView())
    toolbar.add(new HSpacer())
    let data = ['zero','mid','loud','bleeding ears']
    let volume = new DropdownButton(data,0,(v)=>v.toString())
    toolbar.add(volume)
    let add_songs = new ActionButton('add songs')
    add_songs.on('action',()=>{
        let dialog = new DialogContainer()
        let box = new VBox()
        box.add(new ActionButton("dialog header"))
        box.add(new ActionButton("dialog body"))
        let tb = new HBox()
        tb.add(new ActionButton("okay"))
        tb.add(new HSpacer())
        let cancel = new ActionButton('cancel')
        cancel.on('action',()=>{
            let dialog_layer = surf.find_by_name('dialog-layer') as LayerView
            dialog_layer.remove(dialog)
        })
        tb.add(cancel)
        box.add(tb)
        dialog.add(box)
        let dialog_layer = surf.find_by_name('dialog-layer')
        // @ts-ignore
        dialog_layer.add(dialog)
    })
    toolbar.add(add_songs)

    return toolbar
}

function make_statusbar() {
    let status_bar = new HBox()
    status_bar._name = 'statusbar'
    status_bar.fill = '#aaa'
    status_bar.vflex = false
    status_bar.hflex = true
    status_bar.add(new Label("cool status bar"))
    status_bar.add(new HSpacer())
    status_bar.add(new ActionButton("blah"))
    return status_bar
}

class DebugLayer extends LayerView {
    private debug_button: ActionButton;
    private show_debug: boolean;
    constructor() {
        super("debug-layer");
        this._name = 'debug-layer'
        this.debug_button = new ActionButton('debug')
        this.add(this.debug_button)
        this.show_debug = false;
        this.debug_button.on('action',(e:CommonEvent)=>{
            this.show_debug = !this.show_debug
            e.ctx.repaint()
        })
    }
    override draw(g: CanvasSurface) {
        // g.fillBackgroundSize(this.size(),'rgb(0,0,0,0.0)')
        if(this.show_debug) {
            let root = g.get_root()
            this.draw_outline(g, root)
        }
    }

    private draw_outline(g: CanvasSurface, view: View) {
        let pos = view.position()
        let size = view.size()
        g.ctx.save()
        g.ctx.strokeStyle = 'black'
        g.ctx.lineWidth = 1
        let s = 3
        g.ctx.beginPath()
        g.ctx.rect(pos.x+s,pos.y+s,size.w-s*2,size.h-s*2)
        g.ctx.moveTo(pos.x,pos.y)
        g.ctx.lineTo(pos.x+size.w,pos.y+size.h)
        g.ctx.moveTo(pos.x+size.w,pos.y)
        g.ctx.lineTo(pos.x,pos.y+size.h)
        g.ctx.stroke()
        let text = view.name()
        let metrics = g.measureText(text)
        g.ctx.fillStyle = 'black'
        g.ctx.fillRect(pos.x+2,pos.y+2,metrics.w+4,10+4)
        g.ctx.fillStyle = 'white'
        g.ctx.fillText(text,pos.x+4,pos.y+10+4)

        function is_parent(view: View) {
            // @ts-ignore
            return view.is_parent_view && view.is_parent_view()
        }
        function as_parent(view: View):ParentView {
            return view as unknown as ParentView
        }

        if(is_parent(view)) {
            let parent = as_parent(view)
            g.ctx.save()
            g.ctx.translate(pos.x,pos.y)
            parent.get_children().forEach((ch:View) => {
                this.draw_outline(g,ch)
            })
            g.ctx.restore()
        }
    }
    override layout2(g: CanvasSurface, available: Size): Size {
        super.layout2(g, available);
        let size = this.size()
        let csize = this.debug_button.size()
        let pt = new Point(size.w-csize.w, size.h-csize.h)
        this.debug_button.set_position(pt)
        return this.size()
    }
}

export function start() {
    let surface = new CanvasSurface(1024,720, 1.0);
    surface.debug = false

    let main = new LayerView();
    let app_layer = new LayerView()
    main.add(app_layer)

    let dialog_layer = new DialogLayer()
    dialog_layer._name = 'dialog-layer'
    main.add(dialog_layer)

    let popup_layer = new PopupLayer()
    popup_layer._name = 'popup-layer'
    main.add(popup_layer)

    let root = new VBox();
    root._name = 'root'
    root.add(make_toolbar(surface))

    let middle_layer = new HBox()
    middle_layer.vflex = true
    middle_layer._name = 'middle'
    let source_list = new SelectList(['A','B','C'],()=>"cool source")
    source_list.vflex = false

    let scroll = new ScrollView()
    scroll.set_content(source_list)
    scroll.set_pref_width(220)
    scroll.vflex = true
    middle_layer.add(scroll)

    let song_list = new SelectList(['X,Y,Z'],()=>"cool song")
    song_list.hflex = true
    middle_layer.add(song_list)
    root.add(middle_layer)
    root.add(make_statusbar())

    app_layer.add(root)


    main.add(new DebugLayer())
    surface.set_root(main)
    surface.setup_mouse_input()
    surface.addToPage();
    surface.repaint()

    // unit test 1
    //click button1 with a fake mouse click through the canvas.
    //add callback to button1 to confirm the test worked
    // function test1(value) {
    //     console.log("starting test1")
    //     return new Promise((res,rej)=>{
    //         button1.on('action',() => {
    //             console.log("test complete")
    //             res(value)
    //         })
    //         surface.dispatch_fake_mouse_event('mousedown', new Point(60,60))
    //     })
    // }

    function wait(number: number) {
        return new Promise((res,rej)=>{
            setTimeout(()=>{
                res(0)
            },number)
        })
    }
    // async function run_all_tests() {
    //     console.log("starting tests")
    //     // await wait(500)
    //     // console.log('continuing')
    //     let val = await test1(99)
    //     console.assert(val === 99,'test1 failed')
    //     // console.log("test1 passed")
    //     console.log("end of tests")
    // }
    // wait(1000).then(run_all_tests)
}

