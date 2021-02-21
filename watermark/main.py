from flask import Flask

from flask_cors import CORS, cross_origin
from flask import request, jsonify
from flask import send_file
app = Flask(__name__)
CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'


import numpy as np
import pywt
import os
from qrcode import make as makeQR
import base64
import urllib
from PIL import Image
from scipy.fftpack import dct
from scipy.fftpack import idct


current_path = str(os.path.dirname(__file__))
# current_path = current_path.replace('Digital Watermarking', 'CopyrightManagement') + '\\output'  

imageURL = ""   
watermarkURL = ""

def generateQR(data):
    qr = makeQR(data)
    qr.save('qrcode.png')
    global watermarkURL
    watermarkURL = current_path+'/qrcode.png'


def convert_image(image_url, size):
    img = Image.open(image_url).resize((size, size), 1)
    img = img.convert('L')
 
    image_array = np.array(img.getdata(), dtype=np.float).reshape((size, size))
    # print (image_array[0][0])               
    # print (image_array[10][10])           

    return image_array

def process_coefficients(imArray, model, level):
    coeffs=pywt.wavedec2(data = imArray, wavelet = model, level = level)
    # print (coeffs[0].__len__())
    coeffs_H=list(coeffs) 
   
    return coeffs_H


def embed_mod2(coeff_image, coeff_watermark, offset=0):
    for i in range(coeff_watermark.__len__()):
        for j in range(coeff_watermark[i].__len__()):
            coeff_image[i*2+offset][j*2+offset] = coeff_watermark[i][j]

    return coeff_image

def embed_mod4(coeff_image, coeff_watermark):
    for i in range(coeff_watermark.__len__()):
        for j in range(coeff_watermark[i].__len__()):
            coeff_image[i*4][j*4] = coeff_watermark[i][j]

    return coeff_image

            
    
def embed_watermark(watermark_array, orig_image):
    watermark_array_size = watermark_array[0].__len__()
    watermark_flat = watermark_array.ravel()
    ind = 0

    for x in range (0, orig_image.__len__(), 8):
        for y in range (0, orig_image.__len__(), 8):
            if ind < watermark_flat.__len__():
                subdct = orig_image[x:x+8, y:y+8]
                subdct[5][5] = watermark_flat[ind]
                orig_image[x:x+8, y:y+8] = subdct
                ind += 1 


    return orig_image
      


def apply_dct(image_array):
    size = image_array[0].__len__()
    all_subdct = np.empty((size, size))
    for i in range (0, size, 8):
        for j in range (0, size, 8):
            subpixels = image_array[i:i+8, j:j+8]
            subdct = dct(dct(subpixels.T, norm="ortho").T, norm="ortho")
            all_subdct[i:i+8, j:j+8] = subdct

    return all_subdct


def inverse_dct(all_subdct):
    size = all_subdct[0].__len__()
    all_subidct = np.empty((size, size))
    for i in range (0, size, 8):
        for j in range (0, size, 8):
            subidct = idct(idct(all_subdct[i:i+8, j:j+8].T, norm="ortho").T, norm="ortho")
            all_subidct[i:i+8, j:j+8] = subidct

    return all_subidct


def get_watermark(dct_watermarked_coeff, watermark_size):
    
    subwatermarks = []

    for x in range (0, dct_watermarked_coeff.__len__(), 8):
        for y in range (0, dct_watermarked_coeff.__len__(), 8):
            coeff_slice = dct_watermarked_coeff[x:x+8, y:y+8]
            subwatermarks.append(coeff_slice[5][5])

    watermark = np.array(subwatermarks).reshape(watermark_size, watermark_size)

    return watermark


def recover_watermark(image_array, model='haar', level = 1):

    coeffs_watermarked_image = process_coefficients(image_array, model, level=level)
    dct_watermarked_coeff = apply_dct(coeffs_watermarked_image[0])
    
    watermark_array = get_watermark(dct_watermarked_coeff, 128)

    watermark_array =  np.uint8(watermark_array)

#Save result
    img = Image.fromarray(watermark_array)
    img.save(current_path + '/recovered_qrcode.jpg')


def print_image_from_array(image_array, name):
  
    image_array_copy = image_array.clip(0, 255)
    image_array_copy = image_array_copy.astype("uint8")
    img = Image.fromarray(image_array_copy)
    img.save(current_path +name)





def w2d():
    model = 'haar'
    level = 1

    image_array = convert_image("original.jpg", 2048)
    watermark_array = convert_image('qrcode.png', 128)

    coeffs_image = process_coefficients(image_array, model, level=level)
    dct_array = apply_dct(coeffs_image[0])
    dct_array = embed_watermark(watermark_array, dct_array)
    coeffs_image[0] = inverse_dct(dct_array)

# reconstruction
    image_array_H=pywt.waverec2(coeffs_image, model)
    print_image_from_array(image_array_H, '/watermarked_image.jpg')




@app.route('/download/<name>')
def downloadImage(name):
    return send_file(current_path + "/" + name, as_attachment=True)


@app.route('/qrcode/', methods=['GET'])
def qrcodeByte():
    with open("qrcode.png", "rb") as img_file:
        qrcodexx = base64.b64encode(img_file.read())

    return qrcodexx


@app.route('/', methods=['POST'])
def hello_world():
    # print("horrrrrrrrrr", request.form.get('owner_name') + " " + request.form.get('owner_email')+ " " +request.form.get('hash'))
    generateQR("Name : " + request.form.get('owner_name') + "\nEmail : " + request.form.get('owner_email')+ "\npHash : " +request.form.get('hash'))
    data = request.form.get('img')
    response = urllib.request.urlopen(data)
    with open('original.jpg', 'wb') as f:
        f.write(response.file.read())
    
    w2d()

    with open("watermarked_image.jpg", "rb") as img_file:
        result = base64.b64encode(img_file.read())

    

    print('----------------Done------------------')
    return result


@app.route('/recover/', methods=['POST'])
def recoverImage():
    model = 'haar'
    level = 1

    data = request.form.get('img')
    response = urllib.request.urlopen(data)
    with open('recover_watermarked.jpg', 'wb') as f:
        f.write(response.file.read())
    
    image_array_H = convert_image("recover_watermarked.jpg", 2048)

    # recover images
    recover_watermark(image_array = image_array_H, model=model, level = level)

    with open("qrcode.png", "rb") as img_file:
        result = base64.b64encode(img_file.read())

    return result



if __name__ == '__main__':
    print(current_path)
    app.run(debug=True)

