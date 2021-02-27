App = {
  contract: {},
  dataUrl: 0,
  watermarkedImage: 0,
  imageHash: "",
  hexHash: "",
  owner_name: "",
  owner_email: "",
  image_title: "",
  qrcode: "",
  ipfsAddress: "",
  ipfs: "",
  haiKya: false,
  retriveQR: "",


  load: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
    await App.loadIPFS();
  },


  loadWeb3: async () => {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider
      web3 = new Web3(web3.currentProvider)
    } else {
      window.alert("Please connect to Metamask.")
    }

    // Modern dapp browsers...
    if (window.ethereum) {
      window.web3 = new Web3(ethereum)
      try {
        // Request account access if needed
        await ethereum.enable()
        // Acccounts now exposed
        web3.eth.sendTransaction({/* ... */ })
      } catch (error) {
        // User denied account access...
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = web3.currentProvider
      window.web3 = new Web3(web3.currentProvider)
      // Acccounts always exposed
      web3.eth.sendTransaction({/* ... */ })
    }
    // Non-dapp browsers...
    else {
      console.log('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  },

  loadAccount: async () => {
    App.account = web3.eth.currentProvider.selectedAddress
    web3.eth.defaultAccount = App.account
    console.log(App.account)
    if (App.account) {
      $('.waiting').hide()
      $('#content1').show()
      $('#account').html(App.account)
    }
  },

  loadContract: async () => {
    const newblock = await $.getJSON('NewBlock.json')

    App.contract.NewBlock = TruffleContract(newblock)
    App.contract.NewBlock.setProvider(App.web3Provider)

    App.newblock = await App.contract.NewBlock.deployed()

  },

  loadIPFS: async ()=>{
    console.log("IPFS Conected")
    const ipfs = await Ipfs.create();
    App.ipfs = ipfs;
  },

  loading: (kare) => {
    if (kare) {
      $('.overlay').show();
      $("#loading-img").css({ "display": "block" });
    }
    else {
      $('.overlay').hide();
      $("#loading-img").css({ "display": "none" });
    }
  },


  toggleDisplay: (action)=>{
    if(action === 'blocks'){
      $('.newUpload').fadeOut()
      $('.retriveQR').fadeOut()

      $('.form-inline button').removeClass('btn-light')
      $('.form-inline button').addClass('btn-outline-light')
      $('#shw').removeClass('btn-outline-light')
      $('#shw').addClass('btn-light')

      if(!App.haiKya)
        App.blockDetail();

      $('.allBlocks').fadeIn('slow')
    }
    else if(action === 'new'){
      $('.newUpload').fadeIn();
      $('.allBlocks').fadeOut();
      $('.retriveQR').fadeOut();

      $('.form-inline button').removeClass('btn-light')
      $('.form-inline button').addClass('btn-outline-light')
      $('#new').removeClass('btn-outline-light')
      $('#new').addClass('btn-light')
    }
    else if(action === 'retrive'){
      $('.newUpload').fadeOut();
      $('.allBlocks').fadeOut();
      $('.retriveQR').fadeIn();

      $('.form-inline button').removeClass('btn-light')
      $('.form-inline button').addClass('btn-outline-light')
      $('#ret').removeClass('btn-outline-light')
      $('#ret').addClass('btn-light')
    }
  },

  addImage: async () => {

    App.loading(true);

    App.owner_name = $('#owner_name').val();
    App.owner_email = $('#owner_email').val();
    App.image_title = $('#image_title').val();
    
    var hash = await pHash.hash($('#newImage')[0].files[0]);
    App.hexHash = hash.toHex();
    if (await App.checkPiracy(`${hash.toBinary()}`)) {
      App.talkToFlask()
    }

  },

  checkPiracy: async (hash) => {
    let imgCount = await App.newblock.imageCount();
    for (var i = 1; i <= imgCount.toNumber(); i++) {
      const imgInfo = await App.newblock.images(i)
      // console.log(imgInfo[2]+"   "+imgInfo[1])

      if (imgInfo[1] === hash || App.hammingDis(imgInfo[1], hash) <= 0.3) {
        $('#isPirated').html(`This image already has a Copyright in the name of ${imgInfo[3]}`);
        $('.overlay').hide();
        $("#loading-img").css({ "display": "none" });
        return false;
      }
    }
    App.imageHash = hash;
    return true;
  },

  hammingDis: (str1, str2) => {
    // console.log("hamming dis  \n" + str1+"\n"+ str2)
    if (str1.length !== str2.length) {
      return 0;
    }
    let dist = 0;
    for (let i = 0; i < str1.length; i += 1) {
      if (str1[i] !== str2[i]) {
        dist += 1;
      };
    };
    return dist / str1.length;
  },

  talkToFlask: async () => {
    console.log("Talking to flask")
    $.post('http://localhost:5000/',
      {
        "hash": App.imageHash,
        "owner_name": App.owner_name,
        "owner_email": App.owner_email,
        "img": App.dataUrl,
      },
      (data) => {
        // console.log(data)
        App.watermarkedImage = data

        $('#content1').hide()
        $('.after').show()
        $('#watermarked-img').attr('src', "data:image/jpeg;base64," + App.watermarkedImage)
        $.get('http://localhost:5000/qrcode/', (res) => {
          App.qrcode = res
          $('#qrcode').attr('src', "data:image/jpeg;base64," + App.qrcode)

          // App.ipfsUpload();

          App.loading(false);

        })

      })
  },



  blockDetail: async ()=>{
    App.haiKya = true;
    let imgCount = await App.newblock.imageCount();
    let n = imgCount.toNumber();
    for (var i = n; i > 0 ; i--) {

      const imgInfo = await App.newblock.images(i);
      const imgData = await App.getFromIPFS(imgInfo['ipfsAddress']);
      var imgBytes = imgData.replace('data:image/jpeg;base64,', ''); 

      var cnt = `
      <div class="col-sm-4 mt-4">
        <div class="card">
          <div class="img-card">
            <img class="card-img-top" src="${imgData}" alt="Card image cap">
          </div>
          <div class="card-body">
            <h5 class="card-title">${imgInfo[5]}</h5>
            <p class="card-text"><strong>Owner's Name - </strong><br>${imgInfo[3]}</p>
            <p class="card-text"><strong>Owner's Email - </strong><br>${imgInfo[4]}</p>
            <button onclick = "App.imageDownload('${imgBytes}', '${imgInfo[5]}');" class="btn btn-primary">Download</button>
          </div>
        </div>
      </div>`;

      $('.block-detail').append(cnt);
    }
  },


  ipfsUpload: async () => {
    $('.after').hide()
    $('.uploading').show()

    console.log("Uploading to ipfs")
    const ipfs = App.ipfs;
    console.log("Your ipfs: " + ipfs.cid)
    
    const status = ipfs.isOnline() ? 'online' : 'offline'
    console.log(`ipfs status: ${status}`)
    const buf = buffer.Buffer(`data:image/jpeg;base64,${App.watermarkedImage}`)



    const wtimg = await ipfs.add({
      path: `/${App.image_title}.jpg`,
      content: buf,
    })

    console.log('Added file:', wtimg.path, wtimg.cid.string)

    if (wtimg.cid.string) {
      App.ipfsAddress = wtimg.cid.string
      App.loading(false)
      $('.uploading').hide()
      $("#ipfs-address").html(wtimg.cid.string)
      $('.ipfs-complete').css({ display: 'block' })
      // App.addBlock(wtimg.cid.string)
    }
    // console.log('Added file:', qr.path, qr.cid.string)

  },

  addBlock: async () => {
    $('.ipfs-complete').css({ display: 'none' })
    $('.deploying').css({ display: 'block' })


    App.newblock.addImage(`${App.imageHash}`, App.ipfsAddress, App.owner_name, App.owner_email, App.image_title, { from: App.account }).then(() => {
      $('.deploying').hide()
      $('.deployment-complete').show()
    }).catch((error) => {
      $('.deploying').hide()
      $('.deployment-failed').show()
      console.error(error);
    })
  },

  getFromIPFS: async (cid) =>{
    const ipfs = App.ipfs;
    const stream = ipfs.cat(cid)
    let data = ''

    for await (const chunk of stream) {
      // chunks of data are returned as a Buffer, convert it back to a string
      data += chunk.toString()
    }

    return data;
  },

  imageDownload: async (imageBytes, fname) =>{
    function base64ToArrayBuffer(base64) {
      const binaryString = window.atob(base64); // Comment this if not using base64
      const bytes = new Uint8Array(binaryString.length);
      return bytes.map((byte, i) => binaryString.charCodeAt(i));
    }

    function createAndDownloadBlobFile(body, filename, extension = 'jpg') {
      const blob = new Blob([body]);
      const fileName = `${filename}.${extension}`;
      if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, fileName);
      } else {
        const link = document.createElement('a');
        // Browsers that support HTML5 download attribute
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', fileName);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    }

    const arrayBuffer = base64ToArrayBuffer(imageBytes);
    createAndDownloadBlobFile(arrayBuffer, fname);
  },


  retriveQRCode: async ()=>{
    console.log("Talking to flask 111")
    $.post('http://localhost:5000/recover/',
    {
      "img": App.retriveQR,
    },
    (data) => {

      $('#retrive_content1').hide()
      $('.retrive_after').show()
      $('#retrived_qr').attr('src', "data:image/jpeg;base64," + data)
    })
  },

  /* 
      14785093274372630000
      1100110100101111001100111111111110001101111111110110011011111111
  
      16082111165064241000
      1101111100101111001000101110010111011111111111110110001011011111
  
  */
}

$(() => {
  $(window).load(() => {
    App.load()

  })
})