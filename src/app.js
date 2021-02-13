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

  load: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
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
    if(App.account){
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

    // let imgCount = await App.newblock.imageCount();
    // console.log(imgCount.toNumber())

  },

  loading: (kare)=>{
    if(kare){
      $('.overlay').show();
      $("#loading-img").css({"display": "block"});
    }
    else{
      $('.overlay').hide();
      $("#loading-img").css({"display": "none"});
    }
  },

  


  ipfsUpload: async () => {
    $('.after').hide()
    $('.uploading').show()

    console.log("Uploading to ipfs")
    const ipfs = await Ipfs.create()
    console.log("Your ipfs: " + ipfs.cid)
    window.ipfs = ipfs
    const status = ipfs.isOnline() ? 'online' : 'offline'
    console.log(`ipfs status: ${status}`)
    const buf = buffer.Buffer(`data:image/jpeg;base64,${App.watermarkedImage}`)
    // const buf1 = buffer.Buffer(`data:image/jpeg;base64,${App.qrcode}`)
    // await ipfs.files.mkdir(`/${App.image_title}`)

    
    const wtimg = await ipfs.add({
      path: `/${App.image_title}.jpg`,
      content: buf,
    })
    
    // const qr = await ipfs.add({
    //   path: `/${App.image_title}/qrcode.jpg`,
    //   content: buf1
    // })

    // let wtimg = await ipfs.files.write(
    //   `/${App.image_title}/${App.image_title}.jpg`,
    //   buf1,
    //   {create: true})
  
    console.log('Added file:', wtimg.path, wtimg.cid.string)

    if(wtimg.cid.string){
      App.ipfsAddress = wtimg.cid.string
      App.loading(false)
      $('.uploading').hide()
      $("#ipfs-address").html(wtimg.cid.string)
      $('.ipfs-complete').css({display: 'block'})
      // App.addBlock(wtimg.cid.string)
    }
    // console.log('Added file:', qr.path, qr.cid.string)

  },

  addBlock: async () => {
    $('.ipfs-complete').css({display: 'none'})
    $('.deploying').css({display: 'block'})


    App.newblock.addImage(`${App.imageHash}`, App.ipfsAddress, App.owner_name, App.owner_email, App.image_title, { from: App.account }).then(()=>{
      $('.deploying').hide()
      $('.deployment-complete').show()
    }).catch((error)=>{
      $('.deploying').hide()
      $('.deployment-failed').show()
      console.error(error);
    })
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

  /* 
      14785093274372630000
      1100110100101111001100111111111110001101111111110110011011111111
  
      16082111165064241000
      1101111100101111001000101110010111011111111111110110001011011111
  
  */

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

  checkPiracy: async (hash) => {
    let imgCount = await App.newblock.imageCount();
    for (var i = 1; i <= imgCount.toNumber(); i++) {
      const imgInfo = await App.newblock.images(i)
      // console.log(imgInfo[2]+"   "+imgInfo[1])

      if (imgInfo[1] === hash || App.hammingDis(imgInfo[1], hash) <= 0.3) {
        $('#isPirated').html(`This image already has a Copyright in the name of ${imgInfo[3]}`);
        $('.overlay').hide();
        $("#loading-img").css({"display": "none"});
        return false;
      }
    }
    App.imageHash = hash;
    // $('#isPirated').html(`Image Sucessfully Uploaded to the Blockchain`);
    return true;
  },

}

$(() => {
  $(window).load(() => {
    App.load()

  })
})