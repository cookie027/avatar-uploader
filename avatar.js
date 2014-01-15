(function ( root, factory ) {
	if ( typeof define === 'function' && define.amd ) {
		// AMD. Register as an anonymous module.
		define(function () {
			// Also create a global in case some scripts
			// that are loaded still are looking for
			// a global even when an AMD loader is in use.
			return ( root.AvatarUpload = factory() );
		});
	} else {
		// Browser globals
		root.AvatarUpload = factory();
	}
}( this, function () {

	var extend = function(original, extra) {
		return Object.keys(extra).forEach(function(key) {
			original[key] = extra[key];
		});
	};

	var AvatarUpload = function(config) {
		extend(this.config, config);

		if ( ! this.config.el) {
			throw new Error('An element is required to manipulate');
		}

		if ( ! this.config.uploadUrl && ! this.config.pretendUpload) {
			throw new Error('Upload URL not specified');
		}

		this.el = this.config.el;
		this.renderInput();
		this.bindInput();

		this.progressText = this.el.querySelector('span');
		this.imageWrapper = this.el.querySelector('.avatar-upload__image-wrapper');
	};

	AvatarUpload.prototype.config = {
		el: undefined,

		uploadUrl: '',
		uploadMethod: 'post',
		uploadImageKey: 'upload',
		uploadData: {},

		pretendUpload: false,

		onProgress: undefined,
		onSuccess: undefined,
		onError: undefined
	};

	AvatarUpload.prototype.renderInput = function() {
		var imgEl = this.el.querySelector('img'),
			img = imgEl.src;

		var el = document.createElement('div');
		el.className = 'avatar-upload__shell';

		el.innerHTML = [
			'<div class="avatar-upload__wrapper avatar-upload--complete">',
				'<div class="avatar-upload__image-wrapper">',
					'<img src="'+img+'">',
				'</div>',
				'<img src="'+img+'" class="avatar-upload__faded-image">',
				'<div class="avatar-upload__progress-wrapper">',
					'<span>0%</span>',
				'</div>',
				'<input type="file">',
			'</div>',
		].join('');

		imgEl.remove();
		this.el.appendChild(el);

		return this;
	};

	AvatarUpload.prototype.bindInput = function(event) {
		this.el.querySelector('input').addEventListener(
			'change', this.initiateUpload.bind(this), true
		);
	};

	AvatarUpload.prototype.initiateUpload = function(event) {
		var file = event.target.files[0];

		// reset input to allow selecting same file again
		event.target.value = null;

		if ( ! file.type.match(/image.*/)) return;

		// read file & run upload
		var reader = new FileReader;
		reader.onload = this.upload.bind(this);
		reader.readAsDataURL(file);
	};

	AvatarUpload.prototype.upload = function(event) {
		var img = event.target.result;

		this.uiUploadStart(img);

		var Uploader = this.config.pretendUpload ? FakeUploader : XhrUploader;

		Uploader(img, this.config, {
			progress: this.uploadProgress.bind(this),
			success: this.uploadSuccess.bind(this),
			error: this.uploadError.bind(this),
		});
	};

	AvatarUpload.prototype.uploadProgress = function(progress) {
		this.uiUploadProgress(progress);
		if (this.config.onProgress) this.config.onProgress(progress);
	};

	AvatarUpload.prototype.uploadSuccess = function(data) {
		this.uiUploadSuccess(data);
		if (this.config.onSuccess) this.config.onSuccess(data);
	};

	AvatarUpload.prototype.uploadError = function(data) {
		this.uiUploadError(data);
		if (this.config.onError) this.config.onError(data);
	};

	AvatarUpload.prototype.uiUploadStart = function(img) {
		var origSrc;

		Array.prototype.forEach.call(this.el.querySelectorAll('img'), function(imgEl) {
			origSrc = imgEl.src;
			imgEl.src = img;
		});

		this.origSrc = origSrc;

		this.el.querySelector('.avatar-upload__wrapper').className = 'avatar-upload__wrapper'; // remove complete class
	};

	AvatarUpload.prototype.uiUploadProgress = function(progress) {
		this.progressText.textContent = progress+'%';
		this.imageWrapper.style.width = progress+'%';
	};

	AvatarUpload.prototype.uiUploadSuccess = function() {
		this.progressText.textContent = '0%';
		this.imageWrapper.style.width = null;
		this.el.querySelector('.avatar-upload__wrapper').className = 'avatar-upload__wrapper avatar-upload--complete';
	};

	AvatarUpload.prototype.uiUploadError = function(data) {
		this.uiUploadSuccess();

		var origSrc = this.origSrc;
		Array.prototype.forEach.call(this.el.querySelectorAll('img'), function(imgEl) {
			imgEl.src = origSrc;
		});
	};

	var FakeUploader = function(file, config, callbacks) {
		var progress = 0;
		var id = setInterval(function() {
			progress += 1;
			// if (progress == 50) {
			// 	callbacks.error();
			// 	return clearInterval(id);
			// }
			if (progress > 100) {
				callbacks.success();
				return clearInterval(id);
			}
			callbacks.progress(progress);
		}, 50);
	};

	var XhrUploader = function(file, config, callbacks) {
		var xhr = new XMLHttpRequest(),
			formData = new FormData();

		xhr.upload.addEventListener('progress', function(transfer) {
			callbacks.progress(parseInt(
				transfer.loaded / transfer.total * 100
			, 10));
		});

		xhr.onreadystatechange = function(e) {
			if (xhr.readyState !== 4) return;

			if (xhr.status === 200) {
				callbacks.success();
			}
			else {
				callbacks.error();
			}
		};

		formData.append(config.uploadImageKey, file);

		for (val in config.uploadData) {
			formData.append(val, config.uploadData[val]);
		}

		xhr.open(config.uploadMethod, config.uploadUrl);
		xhr.send(formData);
	};

	return AvatarUpload;

}));