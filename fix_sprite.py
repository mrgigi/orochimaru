from PIL import Image
import numpy as np

def make_transparent(image_path):
    img = Image.open(image_path).convert("RGBA")
    data = np.array(img)
    
    # Check the top-left pixel color
    bg_color = data[0, 0]
    
    # If the background is a checkerboard, it's harder, but let's see. 
    # Let's save a copy and see its info
    img.save("test_out.png")
    
make_transparent("public/assets/hokage-boss.png")
