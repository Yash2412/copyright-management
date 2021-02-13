// SPDX-License-Identifier: MIT
pragma solidity 0.5.0;

contract NewBlock {
    uint public imageCount = 0;

    struct ImageInfo{
        uint imageID;
        string pHash;
        string ipfsAddress;
        string owner_name;
        string owner_email;
        string image_title;
    }

    mapping(uint => ImageInfo) public images;

    function addImage(string memory _pHash, string memory _ipfsAddress, string memory _owner_name, string memory _owner_email, string memory _image_title) public{
        uint result = uint(sha256(abi.encodePacked(_owner_email)));

        imageCount++;
        images[imageCount] = ImageInfo(result, _pHash, _ipfsAddress, _owner_name, _owner_email, _image_title);
    }
}